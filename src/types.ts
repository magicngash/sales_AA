export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetDetails {
  id: string;
  title: string;
  url: string;
  sheets: SheetTabInfo[];
}

export interface SalesRecord {
  id: string;
  date: string;
  orderId: string;
  sku: string;
  productName: string;
  category: string;
  unitsSold: number;
  unitPrice: number;
  revenue: number;
  unitCost: number;
  profit: number;
  profitMarginPercent: number;
  currentStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  supplier: string;
  rawRowIndex?: number;
}

export interface SalesSummaryMetrics {
  totalRevenue: number;
  totalUnitsSold: number;
  totalOrders: number;
  grossProfit: number;
  profitMarginPercent: number;
  avgOrderValue: number;
  uniqueSkus: number;
  dateRange: { start: string; end: string };
  topSellingProducts: { sku: string; name: string; units: number; revenue: number }[];
  categoryBreakdown: { category: string; revenue: number; units: number; percentage: number }[];
}

export interface InventoryItemAnalysis {
  sku: string;
  productName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  supplier: string;
  unitsSold: number;
  dailyRunRate: number;
  daysOfSupply: number;
  status: 'out_of_stock' | 'critical' | 'low' | 'healthy' | 'excess';
  suggestedReorderQty: number;
  estimatedReorderCost: number;
}

export interface ActionItemInsight {
  id: string;
  sku: string;
  productName: string;
  category: string;
  urgency: 'critical' | 'warning' | 'opportunity' | 'good';
  issue: string;
  recommendation: string;
  currentStock: number;
  dailyRunRate: number;
  daysRemaining: number;
  suggestedOrderQty: number;
  estimatedCost: number;
}

export interface InventoryInsightsResponse {
  summary: string;
  criticalAlertsCount: number;
  actionItems: ActionItemInsight[];
  strategicTips: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface GeneratedReport {
  id: string;
  title: string;
  generatedAt: string;
  markdownContent: string;
  scope: string;
  syncedToGoogleSheets?: boolean;
  syncedSheetTab?: string;
}
