import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { SalesSummaryMetrics, InventoryItemAnalysis } from '../types';
import { formatCurrency } from '../utils/currency';

interface MetricsOverviewProps {
  metrics: SalesSummaryMetrics;
  inventory: InventoryItemAnalysis[];
  onNavigateTab: (tab: 'qa' | 'reports' | 'inventory' | 'table') => void;
  onAskQuestion: (question: string) => void;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  inventory,
  onNavigateTab,
  onAskQuestion,
}) => {
  const criticalItems = inventory.filter((i) => i.status === 'critical' || i.status === 'out_of_stock');
  const lowItems = inventory.filter((i) => i.status === 'low');

  const maxProductRev = metrics.topSellingProducts.length > 0 ? metrics.topSellingProducts[0].revenue : 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Alert if Critical Inventory */}
      {criticalItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rose-900">
                Action Required: {criticalItems.length} Products with Imminent Stockout Risk
              </h3>
              <p className="text-xs text-rose-700 mt-0.5">
                Current sales velocity exceeds supplier lead times for items like{' '}
                <span className="font-semibold">{criticalItems[0]?.productName}</span>. Restock is needed immediately to prevent stockouts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavigateTab('inventory')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs"
            >
              Review Restock Plan
            </button>
            <button
              onClick={() => onAskQuestion('Which products are at critical risk of stockout and what are the recommended purchase order amounts?')}
              className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-lg transition-colors whitespace-nowrap"
            >
              Ask AI Breakdown
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{metrics.totalOrders} total recorded orders</span>
            </div>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gross Profit &amp; Margin</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(metrics.grossProfit)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                {metrics.profitMarginPercent}% Margin
              </span>
              <span>across catalog</span>
            </div>
          </div>
        </div>

        {/* Units Sold & Avg Order Value */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Volume &amp; Order Value</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.totalUnitsSold.toLocaleString()} <span className="text-sm font-normal text-slate-500">Units</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
              <span>Avg. Order: <strong>{formatCurrency(metrics.avgOrderValue)}</strong></span>
            </div>
          </div>
        </div>

        {/* Inventory Stock Health */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Inventory Health Status</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {criticalItems.length}
              </span>
              <span className="text-xs text-rose-600 font-semibold">Critical Alerts</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
              <span className="text-amber-600 font-medium">{lowItems.length} Low Stock</span>
              <span>&bull;</span>
              <span className="text-emerald-600 font-medium">{inventory.length - criticalItems.length - lowItems.length} Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Grid: Top Selling Products + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top Revenue Generators</h3>
              <p className="text-xs text-slate-500">Highest grossing SKUs in recorded period</p>
            </div>
            <button
              onClick={() => onAskQuestion('What is driving the performance of our top 5 revenue products, and should we adjust their safety stock?')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Deep Dive
            </button>
          </div>

          <div className="space-y-3.5">
            {metrics.topSellingProducts.map((p, idx) => {
              const pct = maxProductRev > 0 ? (p.revenue / maxProductRev) * 100 : 0;
              return (
                <div key={p.sku} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                      <span className="font-medium text-slate-800 truncate" title={p.name}>
                        {p.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.sku}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(p.revenue)}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1.5">({p.units} sold)</span>
                    </div>
                  </div>
                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Category Sales Distribution</h3>
              <p className="text-xs text-slate-500">Revenue split and contribution by department</p>
            </div>
            <button
              onClick={() => onAskQuestion('Which product category has the highest profit margin and highest inventory turnover?')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Category Insights
            </button>
          </div>

          <div className="space-y-3">
            {metrics.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800">{cat.category}</p>
                  <p className="text-[11px] text-slate-500">{cat.units} total units sold</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">
                    {formatCurrency(cat.revenue)}
                  </p>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                    {cat.percentage}% of total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Launchpad to Core Capabilities */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                Automated Intelligence
              </span>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-white">
              Ready to generate automated summary reports or ask sales questions?
            </h3>
            <p className="text-xs text-emerald-100/80 max-w-2xl">
              Gemini analyzes your real spreadsheet entries row-by-row, computes burn rates, and recommends exact purchase order amounts to prevent revenue loss.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateTab('reports')}
              className="px-4 py-2 text-xs font-semibold text-emerald-950 bg-emerald-300 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Generate Summary Report
            </button>
            <button
              onClick={() => onNavigateTab('qa')}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700/80 hover:bg-emerald-700 border border-emerald-500/50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Sales AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
