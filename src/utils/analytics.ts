import {
  SalesRecord,
  SalesSummaryMetrics,
  InventoryItemAnalysis,
  ActionItemInsight
} from '../types';

export function computeSalesMetrics(records: SalesRecord[]): SalesSummaryMetrics {
  if (records.length === 0) {
    return {
      totalRevenue: 0,
      totalUnitsSold: 0,
      totalOrders: 0,
      grossProfit: 0,
      profitMarginPercent: 0,
      avgOrderValue: 0,
      uniqueSkus: 0,
      dateRange: { start: '', end: '' },
      topSellingProducts: [],
      categoryBreakdown: [],
    };
  }

  let totalRev = 0;
  let totalUnits = 0;
  let totalProfit = 0;
  const orderIds = new Set<string>();
  const skus = new Set<string>();
  const productAggMap = new Map<string, { sku: string; name: string; units: number; revenue: number }>();
  const categoryMap = new Map<string, { category: string; revenue: number; units: number }>();
  const dates: string[] = [];

  records.forEach((rec) => {
    totalRev += rec.revenue;
    totalUnits += rec.unitsSold;
    totalProfit += rec.profit;
    orderIds.add(rec.orderId);
    skus.add(rec.sku);
    if (rec.date) dates.push(rec.date);

    // Product aggregate
    const pKey = rec.sku;
    const existingP = productAggMap.get(pKey) || { sku: rec.sku, name: rec.productName, units: 0, revenue: 0 };
    existingP.units += rec.unitsSold;
    existingP.revenue += rec.revenue;
    productAggMap.set(pKey, existingP);

    // Category aggregate
    const cKey = rec.category || 'Uncategorized';
    const existingC = categoryMap.get(cKey) || { category: cKey, revenue: 0, units: 0 };
    existingC.revenue += rec.revenue;
    existingC.units += rec.unitsSold;
    categoryMap.set(cKey, existingC);
  });

  dates.sort();
  const dateRange = {
    start: dates[0] || '',
    end: dates[dates.length - 1] || '',
  };

  const topSellingProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const categoryBreakdown = Array.from(categoryMap.values())
    .map((c) => ({
      ...c,
      percentage: totalRev > 0 ? +((c.revenue / totalRev) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const profitMarginPercent = totalRev > 0 ? +((totalProfit / totalRev) * 100).toFixed(1) : 0;
  const avgOrderValue = orderIds.size > 0 ? +(totalRev / orderIds.size).toFixed(2) : 0;

  return {
    totalRevenue: +totalRev.toFixed(2),
    totalUnitsSold: totalUnits,
    totalOrders: orderIds.size,
    grossProfit: +totalProfit.toFixed(2),
    profitMarginPercent,
    avgOrderValue,
    uniqueSkus: skus.size,
    dateRange,
    topSellingProducts,
    categoryBreakdown,
  };
}

export function computeInventoryHealth(records: SalesRecord[]): InventoryItemAnalysis[] {
  if (records.length === 0) return [];

  // Determine span of days represented in records (minimum 7 days to avoid division blowup)
  const uniqueDates = Array.from(new Set(records.map((r) => r.date).filter(Boolean)));
  const daysSpan = Math.max(7, uniqueDates.length || 14);

  // Group by SKU
  const skuMap = new Map<
    string,
    {
      sku: string;
      productName: string;
      category: string;
      currentStock: number;
      reorderPoint: number;
      leadTimeDays: number;
      supplier: string;
      totalUnitsSold: number;
      unitCost: number;
    }
  >();

  records.forEach((r) => {
    const existing = skuMap.get(r.sku);
    if (!existing) {
      skuMap.set(r.sku, {
        sku: r.sku,
        productName: r.productName,
        category: r.category,
        currentStock: r.currentStock,
        reorderPoint: r.reorderPoint,
        leadTimeDays: r.leadTimeDays,
        supplier: r.supplier,
        totalUnitsSold: r.unitsSold,
        unitCost: r.unitCost,
      });
    } else {
      existing.totalUnitsSold += r.unitsSold;
      // take latest stock/reorder point if changed
      existing.currentStock = r.currentStock;
      existing.reorderPoint = r.reorderPoint;
      existing.leadTimeDays = r.leadTimeDays;
      if (r.unitCost > 0) existing.unitCost = r.unitCost;
    }
  });

  const analysis: InventoryItemAnalysis[] = [];

  skuMap.forEach((item) => {
    const dailyRunRate = +(item.totalUnitsSold / daysSpan).toFixed(2);
    let daysOfSupply = 999;
    if (dailyRunRate > 0) {
      daysOfSupply = +(item.currentStock / dailyRunRate).toFixed(1);
    } else if (item.currentStock === 0) {
      daysOfSupply = 0;
    }

    let status: InventoryItemAnalysis['status'] = 'healthy';
    if (item.currentStock <= 0) {
      status = 'out_of_stock';
    } else if (daysOfSupply <= item.leadTimeDays) {
      // Stock will run out before a new purchase order arrives
      status = 'critical';
    } else if (daysOfSupply <= item.leadTimeDays * 1.5 || item.currentStock <= item.reorderPoint) {
      status = 'low';
    } else if (daysOfSupply > 75 && item.totalUnitsSold > 0) {
      status = 'excess';
    }

    // Suggested reorder: 30 days target supply + safety stock buffer - current stock
    const target30DaySupply = Math.ceil(dailyRunRate * 30);
    const safetyStockBuffer = Math.ceil(dailyRunRate * item.leadTimeDays * 0.5);
    const targetStock = target30DaySupply + safetyStockBuffer + item.reorderPoint;
    const suggestedReorderQty = Math.max(0, targetStock - item.currentStock);
    const estimatedReorderCost = +(suggestedReorderQty * item.unitCost).toFixed(2);

    analysis.push({
      sku: item.sku,
      productName: item.productName,
      category: item.category,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      leadTimeDays: item.leadTimeDays,
      supplier: item.supplier,
      unitsSold: item.totalUnitsSold,
      dailyRunRate,
      daysOfSupply,
      status,
      suggestedReorderQty,
      estimatedReorderCost,
    });
  });

  // Sort by urgency: out_of_stock -> critical -> low -> healthy -> excess
  const statusWeight: Record<InventoryItemAnalysis['status'], number> = {
    out_of_stock: 0,
    critical: 1,
    low: 2,
    excess: 3,
    healthy: 4,
  };

  return analysis.sort((a, b) => statusWeight[a.status] - statusWeight[b.status]);
}

export function generateDeterministicInsights(
  inventory: InventoryItemAnalysis[]
): ActionItemInsight[] {
  const actions: ActionItemInsight[] = [];

  inventory.forEach((item, idx) => {
    if (item.status === 'out_of_stock') {
      actions.push({
        id: `act-${idx}`,
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        urgency: 'critical',
        issue: `Stock depleted (0 units). Lead time is ${item.leadTimeDays} days with ${item.supplier}.`,
        recommendation: `Emergency restock: Order ${item.suggestedReorderQty || 50} units immediately to recover lost sales demand.`,
        currentStock: 0,
        dailyRunRate: item.dailyRunRate,
        daysRemaining: 0,
        suggestedOrderQty: item.suggestedReorderQty || 50,
        estimatedCost: item.estimatedReorderCost,
      });
    } else if (item.status === 'critical') {
      actions.push({
        id: `act-${idx}`,
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        urgency: 'critical',
        issue: `Imminent stockout: Only ${item.daysOfSupply} days of stock remaining at current run-rate (${item.dailyRunRate}/day), but supplier lead time is ${item.leadTimeDays} days.`,
        recommendation: `Issue Purchase Order for ${item.suggestedReorderQty} units to ${item.supplier} today to avoid stockout.`,
        currentStock: item.currentStock,
        dailyRunRate: item.dailyRunRate,
        daysRemaining: item.daysOfSupply,
        suggestedOrderQty: item.suggestedReorderQty,
        estimatedCost: item.estimatedReorderCost,
      });
    } else if (item.status === 'low') {
      actions.push({
        id: `act-${idx}`,
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        urgency: 'warning',
        issue: `Stock (${item.currentStock} units) is near reorder threshold (${item.reorderPoint}). Run rate is ${item.dailyRunRate}/day.`,
        recommendation: `Queue replenishment of ${item.suggestedReorderQty} units within the upcoming weekly procurement cycle.`,
        currentStock: item.currentStock,
        dailyRunRate: item.dailyRunRate,
        daysRemaining: item.daysOfSupply,
        suggestedOrderQty: item.suggestedReorderQty,
        estimatedCost: item.estimatedReorderCost,
      });
    } else if (item.status === 'excess') {
      actions.push({
        id: `act-${idx}`,
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        urgency: 'opportunity',
        issue: `High holding capital: ${item.currentStock} units on hand represents ~${item.daysOfSupply} days of supply.`,
        recommendation: `Do not reorder. Consider bundling or promotional campaign to accelerate inventory turnover and free capital.`,
        currentStock: item.currentStock,
        dailyRunRate: item.dailyRunRate,
        daysRemaining: item.daysOfSupply,
        suggestedOrderQty: 0,
        estimatedCost: 0,
      });
    }
  });

  return actions;
}
