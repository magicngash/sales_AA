import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  Download,
  Copy,
  Check,
  Share2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { GeneratedReport, SpreadsheetDetails } from '../types';

interface AutomatedReportsProps {
  currentReport: GeneratedReport | null;
  onGenerateReport: (scope: string) => Promise<void>;
  isGenerating: boolean;
  onExportToGoogleSheets: (report: GeneratedReport) => Promise<string | void>;
  isExporting: boolean;
  currentSpreadsheet: SpreadsheetDetails | null;
  hasGoogleAuth: boolean;
  onGoogleSignIn: () => void;
  reportHistory: GeneratedReport[];
  onSelectHistoricalReport: (report: GeneratedReport) => void;
  generationError?: string | null;
  onDismissGenerationError?: () => void;
}

export const AutomatedReports: React.FC<AutomatedReportsProps> = ({
  currentReport,
  onGenerateReport,
  isGenerating,
  onExportToGoogleSheets,
  isExporting,
  currentSpreadsheet,
  hasGoogleAuth,
  onGoogleSignIn,
  reportHistory,
  onSelectHistoricalReport,
  generationError,
  onDismissGenerationError,
}) => {
  const [selectedScope, setSelectedScope] = useState<string>('Full Executive Performance');
  const [copied, setCopied] = useState(false);
  const [exportSuccessTab, setExportSuccessTab] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleCopy = () => {
    if (!currentReport) return;
    navigator.clipboard.writeText(currentReport.markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!currentReport) return;
    const blob = new Blob([currentReport.markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Inventory_Report_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSheets = async () => {
    if (!currentReport) return;
    setExportError(null);
    setExportSuccessTab(null);
    try {
      const tabName = await onExportToGoogleSheets(currentReport);
      if (tabName) {
        setExportSuccessTab(tabName);
      }
    } catch (err: any) {
      setExportError(err?.message || 'Failed to export report to Google Sheets.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Configuration & Trigger Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h2 className="text-sm font-semibold text-slate-900">
              Automated Sales &amp; Inventory Report Generator
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Synthesizes orders, margins, and stock velocities into an executive-ready operational brief.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            id="report-scope-select"
            value={selectedScope}
            onChange={(e) => setSelectedScope(e.target.value)}
            disabled={isGenerating}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Full Executive Performance">Full Executive Performance Report</option>
            <option value="Stockout & Replenishment Urgency">Stockout &amp; Replenishment Urgency Audit</option>
            <option value="Category & Margin Profitability">Category &amp; Margin Profitability Breakdown</option>
          </select>

          <button
            id="generate-report-btn"
            onClick={() => onGenerateReport(selectedScope)}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Analyzing & Writing...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Export Notifications */}
      {generationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{generationError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGenerateReport(selectedScope)}
              disabled={isGenerating}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              Try Again
            </button>
            {onDismissGenerationError && (
              <button
                onClick={onDismissGenerationError}
                className="text-rose-600 hover:text-rose-800 font-medium px-1"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {exportSuccessTab && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Successfully exported report to new sheet tab: <strong>&quot;{exportSuccessTab}&quot;</strong> in your Google Spreadsheet!
            </span>
          </div>
          {currentSpreadsheet?.url && (
            <a
              href={currentSpreadsheet.url}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
            >
              Open in Sheets <ExternalLink className="w-3 h-3" />
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

      {/* Report Content View */}
      {currentReport ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Action Toolbar */}
          <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-800">{currentReport.title}</span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-500">
                Generated {new Date(currentReport.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="copy-report-btn"
                onClick={handleCopy}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-white transition-colors flex items-center gap-1.5"
                title="Copy markdown text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <button
                id="download-report-btn"
                onClick={handleDownload}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-white transition-colors flex items-center gap-1.5"
                title="Download as Markdown"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>

              {hasGoogleAuth && currentSpreadsheet ? (
                <button
                  id="export-to-sheet-btn"
                  onClick={handleExportSheets}
                  disabled={isExporting}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  title="Write this report into a new tab in your Google Sheet"
                >
                  <FileSpreadsheet className={`w-3.5 h-3.5 ${isExporting ? 'animate-spin' : ''}`} />
                  {isExporting ? 'Exporting to Sheet...' : 'Export to Google Sheets'}
                </button>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Sign In to Export to Sheets
                </button>
              )}
            </div>
          </div>

          {/* Rendered Markdown Body */}
          <div className="p-8 max-w-4xl mx-auto prose prose-slate prose-headings:font-semibold prose-headings:text-slate-900 prose-h1:text-xl prose-h2:text-base prose-h3:text-sm prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs text-slate-800 space-y-4">
            <ReactMarkdown>{currentReport.markdownContent}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">No report generated yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Select your desired report scope above and click &quot;Generate Report&quot; to produce an automated summary with inventory recommendations.
            </p>
          </div>
          <button
            onClick={() => onGenerateReport(selectedScope)}
            disabled={isGenerating}
            className="mt-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Initial Report
          </button>
        </div>
      )}

      {/* Historical Reports during this session */}
      {reportHistory.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Generated Reports in this Session
          </h4>
          <div className="flex flex-wrap gap-2">
            {reportHistory.map((rep) => (
              <button
                key={rep.id}
                onClick={() => onSelectHistoricalReport(rep)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  currentReport?.id === rep.id
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span>{rep.scope}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(rep.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
