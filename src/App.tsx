import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { SalesQAChat } from './components/SalesQAChat';
import { AutomatedReports } from './components/AutomatedReports';
import { InventoryInsights } from './components/InventoryInsights';
import { SalesDataGrid } from './components/SalesDataGrid';
import { SheetSelectorModal } from './components/SheetSelectorModal';
import {
  UserProfile,
  SpreadsheetDetails,
  SalesRecord,
  ChatMessage,
  GeneratedReport,
  ActionItemInsight,
} from './types';
import { initAuth, googleSignIn, logout } from './services/auth';
import {
  fetchSheetValues,
  parseRowsToSalesRecords,
  createDemoSalesSpreadsheet,
  exportReportToNewTab,
  exportRestockPlanToSheet,
} from './services/googleSheets';
import { INITIAL_SAMPLE_SALES } from './services/sampleData';
import {
  computeSalesMetrics,
  computeInventoryHealth,
  generateDeterministicInsights,
} from './utils/analytics';
import {
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  PlusCircle,
  Bot
} from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active view
  const [activeTab, setActiveTab] = useState<'dashboard' | 'qa' | 'reports' | 'inventory' | 'table'>('dashboard');

  // Sheet state
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<SpreadsheetDetails | null>(null);
  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>('Kenyan_Pub_Sales');
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>(INITIAL_SAMPLE_SALES);
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // AI Q&A State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [prefillQuestion, setPrefillQuestion] = useState<string>('');

  // Automated Reports State
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [reportHistory, setReportHistory] = useState<GeneratedReport[]>([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);

  // Actionable Inventory Intelligence State
  const [aiActionItems, setAiActionItems] = useState<ActionItemInsight[]>([]);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [isExportingPlan, setIsExportingPlan] = useState(false);

  // Computed metrics & analytics
  const metrics = useMemo(() => computeSalesMetrics(salesRecords), [salesRecords]);
  const inventoryHealth = useMemo(() => computeInventoryHealth(salesRecords), [salesRecords]);
  const deterministicActions = useMemo(() => generateDeterministicInsights(inventoryHealth), [inventoryHealth]);

  const combinedActionItems = useMemo(() => {
    if (aiActionItems.length > 0) return aiActionItems;
    return deterministicActions;
  }, [aiActionItems, deterministicActions]);

  const criticalAlertsCount = useMemo(() => {
    return combinedActionItems.filter((a) => a.urgency === 'critical').length;
  }, [combinedActionItems]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (profile, token) => {
        setUser(profile);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      const res = await googleSignIn();
      setUser(res.user);
      setAccessToken(res.accessToken);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      const code = err?.code || 'unknown';
      const message = err?.message || 'Google sign-in failed.';
      const guidance =
        code === 'auth/unauthorized-domain'
          ? 'Add this site\'s hostname to Firebase Console → Authentication → Settings → Authorized domains.'
          : code === 'auth/popup-blocked'
            ? 'Allow pop-ups for this site and try again.'
            : code === 'auth/popup-closed-by-user'
              ? 'The Google sign-in window was closed before sign-in completed.'
              : `${message} (Firebase code: ${code})`;
      setAuthError(guidance);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  // Load Sheet data
  const loadSheetData = useCallback(async (details: SpreadsheetDetails, sheetTitle: string) => {
    if (!accessToken) return;
    setIsFetchingSheet(true);
    setSheetError(null);
    try {
      const { headers, rawRows } = await fetchSheetValues(accessToken, details.id, sheetTitle);
      if (rawRows.length === 0) {
        setSheetError(`Sheet "${sheetTitle}" appears to be empty.`);
        return;
      }
      const parsed = parseRowsToSalesRecords(headers, rawRows);
      if (parsed.length === 0) {
        setSheetError('No valid sales records detected. Check your column headers.');
        return;
      }
      setCurrentSpreadsheet(details);
      setSelectedSheetTitle(sheetTitle);
      setSalesRecords(parsed);
      setAiActionItems([]); // reset AI items to trigger fresh calculation
    } catch (err: any) {
      console.error('Error loading sheet:', err);
      setSheetError(err?.message || 'Failed to read spreadsheet records.');
    } finally {
      setIsFetchingSheet(false);
    }
  }, [accessToken]);

  // Handle Sheet Selection from modal
  const handleSelectSpreadsheet = async (details: SpreadsheetDetails, sheetTitle: string) => {
    await loadSheetData(details, sheetTitle);
  };

  // Create demo spreadsheet in user's Google Drive
  const handleCreateDemoSheet = async () => {
    if (!accessToken) {
      handleLogin();
      return;
    }
    setIsCreatingDemo(true);
    setSheetError(null);
    try {
      const result = await createDemoSalesSpreadsheet(accessToken);
      const details: SpreadsheetDetails = {
        id: result.spreadsheetId,
        title: result.title,
        url: result.url,
        sheets: [{ sheetId: 0, title: 'Sales_Data', rowCount: 16, columnCount: 14 }],
      };
      await loadSheetData(details, 'Sales_Data');
      setSheetModalOpen(false);
    } catch (err: any) {
      console.error('Error creating demo spreadsheet:', err);
      setSheetError(err?.message || 'Failed to create demo sheet in Google Drive.');
    } finally {
      setIsCreatingDemo(false);
    }
  };

  // Load built-in sample data
  const handleLoadSampleData = () => {
    setCurrentSpreadsheet(null);
    setSelectedSheetTitle('Sample_Sales_Dataset');
    setSalesRecords(INITIAL_SAMPLE_SALES);
    setSheetError(null);
    setAiActionItems([]);
  };

  // Send Question to DeepSeek AI
  const handleSendMessage = async (question: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/deepseek/ask-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          datasetSummary: metrics,
          sampleRows: salesRecords.slice(0, 25),
          inventoryStatus: inventoryHealth.slice(0, 15),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `Server returned error (${response.status})`);
      }

      const data = await response.json();
      const aiMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'No response generated.',
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Error processing sales analysis: ${err?.message || 'Could not connect to DeepSeek service.'}`,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Generate Automated Summary Report with DeepSeek
  const handleGenerateReport = async (scope: string) => {
    setIsGeneratingReport(true);
    setReportError(null);
    try {
      const response = await fetch('/api/deepseek/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetSummary: metrics,
          topPerformers: metrics.topSellingProducts,
          categoryBreakdown: metrics.categoryBreakdown,
          inventoryRisks: inventoryHealth.filter((i) => i.status === 'critical' || i.status === 'out_of_stock' || i.status === 'low'),
          reportScope: scope,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to generate report.');
      }

      const data = await response.json();
      const newReport: GeneratedReport = {
        id: `rep-${Date.now()}`,
        title: `${scope} — ${selectedSheetTitle}`,
        generatedAt: data.generatedAt || new Date().toISOString(),
        markdownContent: data.markdownReport,
        scope,
      };

      setCurrentReport(newReport);
      setReportHistory((prev) => [newReport, ...prev]);
    } catch (err: any) {
      console.error('Report generation error:', err);
      setReportError(err?.message || 'Error generating report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Export Report to Google Sheets
  const handleExportReportToSheets = async (report: GeneratedReport): Promise<string> => {
    if (!accessToken || !currentSpreadsheet) {
      throw new Error('Please sign in and select a Google Sheet first.');
    }
    setIsExportingReport(true);
    try {
      const tabTitle = `AI_Report_${new Date().toISOString().slice(5, 10).replace('-', '')}`;
      const createdTab = await exportReportToNewTab(
        accessToken,
        currentSpreadsheet.id,
        tabTitle,
        report.markdownContent
      );
      report.syncedToGoogleSheets = true;
      report.syncedSheetTab = createdTab;
      return createdTab;
    } finally {
      setIsExportingReport(false);
    }
  };

  // Fetch or refresh structured inventory insights
  const handleRefreshInventoryInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      const response = await fetch('/api/deepseek/inventory-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryData: inventoryHealth,
          salesTrends: metrics.topSellingProducts,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.actionItems) && data.actionItems.length > 0) {
          setAiActionItems(data.actionItems);
        }
      }
    } catch (err: any) {
      console.warn('AI inventory insights fallback to deterministic calculation:', err);
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  // Export Restock Plan to Google Sheets
  const handleExportRestockPlan = async (): Promise<string> => {
    if (!accessToken || !currentSpreadsheet) {
      throw new Error('Please sign in and select a Google Sheet first.');
    }
    setIsExportingPlan(true);
    try {
      const createdTab = await exportRestockPlanToSheet(
        accessToken,
        currentSpreadsheet.id,
        combinedActionItems
      );
      return createdTab;
    } finally {
      setIsExportingPlan(false);
    }
  };

  const handleAskQuestionPrefill = (q: string) => {
    setPrefillQuestion(q);
    setActiveTab('qa');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* App Header */}
      <Header
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentSpreadsheet={currentSpreadsheet}
        selectedSheetTitle={selectedSheetTitle}
        onOpenSheetSelector={() => setSheetModalOpen(true)}
        onCreateDemoSheet={handleCreateDemoSheet}
        isCreatingDemo={isCreatingDemo}
        criticalAlertsCount={criticalAlertsCount}
      />

      {authError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-rose-600 hover:text-rose-800 font-semibold shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error notification banner */}
        {sheetError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{sheetError}</span>
            </div>
            <button
              onClick={() => setSheetError(null)}
              className="text-rose-600 hover:text-rose-800 font-semibold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Sheet Banner */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Active Dataset:</span>
            <span className="font-semibold text-slate-900">
              {currentSpreadsheet ? currentSpreadsheet.title : 'Simba Corner Pub & Grill (Kenya) — Sales & Inventory'}
            </span>
            <span className="text-slate-400">({salesRecords.length} records analyzed)</span>
          </div>

          <div className="flex items-center gap-3">
            {currentSpreadsheet ? (
              <a
                href={currentSpreadsheet.url}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 hover:underline"
              >
                <span>Live Google Sheet</span>
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-slate-400">Prototyping Mode</span>
            )}

            <button
              onClick={() => setSheetModalOpen(true)}
              className="font-medium text-slate-700 hover:text-slate-900 hover:underline"
            >
              Change Sheet
            </button>
          </div>
        </div>

        {/* View Switcher */}
        {activeTab === 'dashboard' && (
          <MetricsOverview
            metrics={metrics}
            inventory={inventoryHealth}
            onNavigateTab={setActiveTab}
            onAskQuestion={handleAskQuestionPrefill}
          />
        )}

        {activeTab === 'qa' && (
          <SalesQAChat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            onClearHistory={() => setChatMessages([])}
            recordsCount={salesRecords.length}
            sheetTitle={selectedSheetTitle}
            externalPrefillQuestion={prefillQuestion}
            onPrefillHandled={() => setPrefillQuestion('')}
          />
        )}

        {activeTab === 'reports' && (
          <AutomatedReports
            currentReport={currentReport}
            onGenerateReport={handleGenerateReport}
            isGenerating={isGeneratingReport}
            onExportToGoogleSheets={handleExportReportToSheets}
            isExporting={isExportingReport}
            currentSpreadsheet={currentSpreadsheet}
            hasGoogleAuth={!!accessToken}
            onGoogleSignIn={handleLogin}
            reportHistory={reportHistory}
            onSelectHistoricalReport={setCurrentReport}
            generationError={reportError}
            onDismissGenerationError={() => setReportError(null)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryInsights
            inventory={inventoryHealth}
            actionItems={combinedActionItems}
            onRefreshInsights={handleRefreshInventoryInsights}
            isRefreshing={isRefreshingInsights}
            onExportRestockPlan={handleExportRestockPlan}
            isExportingPlan={isExportingPlan}
            currentSpreadsheet={currentSpreadsheet}
            hasGoogleAuth={!!accessToken}
            onAskQuestion={handleAskQuestionPrefill}
          />
        )}

        {activeTab === 'table' && (
          <SalesDataGrid
            records={salesRecords}
            currentSpreadsheet={currentSpreadsheet}
            sheetTitle={selectedSheetTitle}
          />
        )}
      </main>

      {/* Sheet Picker / Creator Modal */}
      <SheetSelectorModal
        isOpen={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        accessToken={accessToken}
        onSelectSpreadsheet={handleSelectSpreadsheet}
        onLoadSampleData={handleLoadSampleData}
        onCreateDemoSheet={handleCreateDemoSheet}
        isCreatingDemo={isCreatingDemo}
        currentSpreadsheetId={currentSpreadsheet?.id}
        onGoogleSignIn={handleLogin}
      />
    </div>
  );
}
