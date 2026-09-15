import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  DollarSign,
  ArrowRight,
  Truck,
  FileSpreadsheet
} from 'lucide-react';
import { InventoryItemAnalysis, ActionItemInsight, SpreadsheetDetails } from '../types';
import { formatCurrency } from '../utils/currency';

interface InventoryInsightsProps {
  inventory: InventoryItemAnalysis[];
  actionItems: ActionItemInsight[];
  onRefreshInsights: () => Promise<void>;
  isRefreshing: boolean;
  onExportRestockPlan: () => Promise<string | void>;
  isExportingPlan: boolean;
  currentSpreadsheet: SpreadsheetDetails | null;
  hasGoogleAuth: boolean;
  onAskQuestion: (q: string) => void;
}

export const InventoryInsights: React.FC<InventoryInsightsProps> = ({
  inventory,
  actionItems,
  onRefreshInsights,
  isRefreshing,
  onExportRestockPlan,
  isExportingPlan,
  currentSpreadsheet,
  hasGoogleAuth,
  onAskQuestion,
}) => {
  const [filterUrgency, setFilterUrgency] = useState<'all' | 'critical' | 'warning' | 'opportunity'>('all');
  const [exportSuccessTab, setExportSuccessTab] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const criticalCount = actionItems.filter((a) => a.urgency === 'critical').length;
  const warningCount = actionItems.filter((a) => a.urgency === 'warning').length;
  const opportunityCount = actionItems.filter((a) => a.urgency === 'opportunity').length;

  const totalCapitalNeeded = actionItems
    .filter((a) => a.urgency === 'critical' || a.urgency === 'warning')
    .reduce((sum, a) => sum + (a.estimatedCost || 0), 0);

  const filteredItems = actionItems.filter((item) => {
    if (filterUrgency === 'all') return true;
    return item.urgency === filterUrgency;
  });

  const handleSyncToSheets = async () => {
    setExportSuccessTab(null);
    setExportError(null);
    try {
      const tab = await onExportRestockPlan();
      if (tab) {
        setExportSuccessTab(tab);
      }
    } catch (err: any) {
      setExportError(err?.message || 'Failed to sync restock plan to Google Sheets.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-rose-100 text-rose-700">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-semibold text-slate-900">
              Actionable Inventory Intelligence &amp; Stock Velocity
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Calculated from sales burn-rate, supplier lead times, and on-hand inventory levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="refresh-insights-btn"
            onClick={onRefreshInsights}
            disabled={isRefreshing}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Intelligence
          </button>

          {hasGoogleAuth && currentSpreadsheet ? (
            <button
              id="sync-restock-plan-btn"
              onClick={handleSyncToSheets}
              disabled={isExportingPlan}
              className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isExportingPlan ? 'animate-spin' : ''}`} />
              {isExportingPlan ? 'Exporting Plan...' : 'Sync Restock Plan to Sheet'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Sync Alerts */}
      {exportSuccessTab && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Restock plan exported to tab <strong>&quot;{exportSuccessTab}&quot;</strong> in your Google Sheet!
            </span>
          </div>
          {currentSpreadsheet?.url && (
            <a
              href={currentSpreadsheet.url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
            >
              Open Google Sheet <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {exportError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{exportError}</span>
        </div>
      )}

      {/* Metric Cards for Inventory Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Alerts */}
        <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 text-xs font-semibold">
            <span>Critical Restock Urgency</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-700">
              {criticalCount} <span className="text-xs font-normal text-rose-600">SKUs</span>
            </div>
            <p className="text-[11px] text-rose-600/90 mt-1">
              Stockout projected before supplier lead time delivery
            </p>
          </div>
        </div>

        {/* Reorder Approaching */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Low Stock Reorders</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-800">
              {warningCount} <span className="text-xs font-normal text-amber-600">SKUs</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              Approaching minimum safety stock buffer
            </p>
          </div>
        </div>

        {/* Excess Stock */}
        <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
            <span>Excess / Slow Moving</span>
            <Package className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-blue-800">
              {opportunityCount} <span className="text-xs font-normal text-blue-600">SKUs</span>
            </div>
            <p className="text-[11px] text-blue-700 mt-1">
              &gt;60 days of inventory supply on hand
            </p>
          </div>
        </div>

        {/* Replenishment Capital Budget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Estimated Restock Budget</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalCapitalNeeded)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total suggested purchase order expenditure
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <span className="text-xs text-slate-400 font-medium">Filter by:</span>
        <button
          onClick={() => setFilterUrgency('all')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            filterUrgency === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Items ({actionItems.length})
        </button>
        <button
          onClick={() => setFilterUrgency('critical')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            filterUrgency === 'critical'
              ? 'bg-rose-600 text-white'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() => setFilterUrgency('warning')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            filterUrgency === 'warning'
              ? 'bg-amber-600 text-white'
              : 'text-amber-700 hover:bg-amber-50'
          }`}
        >
          Warning ({warningCount})
        </button>
        <button
          onClick={() => setFilterUrgency('opportunity')}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            filterUrgency === 'opportunity'
              ? 'bg-blue-600 text-white'
              : 'text-blue-700 hover:bg-blue-50'
          }`}
        >
          Excess Capital ({opportunityCount})
        </button>
      </div>

      {/* Actionable Insights Cards */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            No items in this category. All current products are performing well.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCrit = item.urgency === 'critical';
            const isWarn = item.urgency === 'warning';
            const isOpp = item.urgency === 'opportunity';

            const cardBorder = isCrit
              ? 'border-rose-300 bg-rose-50/20'
              : isWarn
              ? 'border-amber-300 bg-amber-50/20'
              : isOpp
              ? 'border-blue-200 bg-blue-50/20'
              : 'border-slate-200 bg-white';

            const badgeColor = isCrit
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : isWarn
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : isOpp
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border ${cardBorder} shadow-2xs transition-all space-y-3`}
              >
                {/* Item header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${badgeColor}`}>
                        {item.urgency === 'critical' ? 'Urgent Reorder' : item.urgency.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {item.sku}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs text-slate-500">{item.category}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{item.productName}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Stock on Hand</p>
                      <p className="font-bold text-slate-900 text-sm">
                        {item.currentStock} units
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Daily Run-Rate</p>
                      <p className="font-semibold text-slate-800">
                        {item.dailyRunRate} units/day
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-[10px] uppercase font-semibold">Days of Supply</p>
                      <p className={`font-bold ${isCrit ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-slate-700'}`}>
                        {item.daysRemaining > 365 ? '>1 year' : `${item.daysRemaining} days`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Problem identification & AI Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Identified Risk / Trend
                    </p>
                    <p className="text-slate-700">{item.issue}</p>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" /> Actionable Strategy
                    </p>
                    <p className="text-emerald-950 font-medium">{item.recommendation}</p>
                  </div>
                </div>

                {/* Bottom reorder figures & direct question action */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    {item.suggestedOrderQty > 0 ? (
                      <>
                        <span>
                          Suggested Reorder: <strong className="text-slate-800">{item.suggestedOrderQty} units</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Estimated Cost: <strong className="text-slate-800">{formatCurrency(item.estimatedCost)}</strong>
                        </span>
                      </>
                    ) : (
                      <span className="text-blue-600 font-medium">No reorder needed &bull; Promote or bundle</span>
                    )}
                  </div>

                  <button
                    onClick={() => onAskQuestion(`Provide a detailed supplier restock schedule for SKU ${item.sku} (${item.productName}) including buffer days.`)}
                    className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 hover:underline"
                  >
                    <span>Analyze with AI</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
