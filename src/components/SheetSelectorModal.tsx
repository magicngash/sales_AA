import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Search,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Database,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { DriveSpreadsheetFile, SpreadsheetDetails, SheetTabInfo } from '../types';
import { listDriveSpreadsheets, getSpreadsheetDetails } from '../services/googleSheets';

interface SheetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onSelectSpreadsheet: (details: SpreadsheetDetails, sheetTitle: string) => void;
  onLoadSampleData: () => void;
  onCreateDemoSheet: () => void;
  isCreatingDemo: boolean;
  currentSpreadsheetId?: string;
  onGoogleSignIn: () => void;
}

export const SheetSelectorModal: React.FC<SheetSelectorModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onSelectSpreadsheet,
  onLoadSampleData,
  onCreateDemoSheet,
  isCreatingDemo,
  currentSpreadsheetId,
  onGoogleSignIn,
}) => {
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Sheet tab picker step
  const [pendingDetails, setPendingDetails] = useState<SpreadsheetDetails | null>(null);
  const [selectedTabTitle, setSelectedTabTitle] = useState<string>('');

  useEffect(() => {
    if (isOpen && accessToken) {
      loadDriveFiles();
    }
  }, [isOpen, accessToken]);

  const loadDriveFiles = async () => {
    if (!accessToken) return;
    setLoadingDrive(true);
    setDriveError(null);
    try {
      const files = await listDriveSpreadsheets(accessToken);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Error fetching drive spreadsheets:', err);
      setDriveError(err?.message || 'Unable to list spreadsheets from your Google Drive.');
    } finally {
      setLoadingDrive(false);
    }
  };

  const handlePickFile = async (fileId: string) => {
    if (!accessToken) return;
    setLoadingDrive(true);
    setDriveError(null);
    try {
      const details = await getSpreadsheetDetails(accessToken, fileId);
      if (details.sheets.length === 1) {
        onSelectSpreadsheet(details, details.sheets[0].title);
        onClose();
      } else {
        setPendingDetails(details);
        setSelectedTabTitle(details.sheets[0]?.title || 'Sheet1');
      }
    } catch (err: any) {
      setDriveError(err?.message || 'Could not load details for this spreadsheet.');
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleLoadCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim() || !accessToken) return;
    setCustomLoading(true);
    setCustomError(null);
    try {
      const details = await getSpreadsheetDetails(accessToken, customInput.trim());
      if (details.sheets.length === 1) {
        onSelectSpreadsheet(details, details.sheets[0].title);
        onClose();
      } else {
        setPendingDetails(details);
        setSelectedTabTitle(details.sheets[0]?.title || 'Sheet1');
      }
    } catch (err: any) {
      setCustomError(err?.message || 'Could not access spreadsheet. Ensure you have permission to view it.');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleConfirmTab = () => {
    if (pendingDetails && selectedTabTitle) {
      onSelectSpreadsheet(pendingDetails, selectedTabTitle);
      setPendingDetails(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredFiles = driveFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        id="sheet-selector-modal"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {pendingDetails ? 'Select Sheet Tab' : 'Choose Google Spreadsheet'}
              </h2>
              <p className="text-xs text-slate-500">
                {pendingDetails
                  ? `Choose which sheet to analyze from "${pendingDetails.title}"`
                  : 'Select an existing sales sheet or create a demo template in Google Drive'}
              </p>
            </div>
          </div>
          <button
            id="close-sheet-modal-btn"
            onClick={() => {
              setPendingDetails(null);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {pendingDetails ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                Found <strong>{pendingDetails.sheets.length}</strong> sheets inside{' '}
                <span className="font-semibold">&quot;{pendingDetails.title}&quot;</span>. Please pick the
                sheet that contains your sales or inventory records:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
                {pendingDetails.sheets.map((sheet: SheetTabInfo) => (
                  <button
                    key={sheet.sheetId}
                    type="button"
                    onClick={() => setSelectedTabTitle(sheet.title)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedTabTitle === sheet.title
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{sheet.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {sheet.rowCount ? `${sheet.rowCount} rows` : 'Table records'}
                      </p>
                    </div>
                    {selectedTabTitle === sheet.title && (
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingDetails(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTab}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
                >
                  Confirm &amp; Load Data
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* If not logged in, prompt sign in */}
              {!accessToken ? (
                <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Connect Your Google Account</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Sign in with Google to browse and analyze your real sales spreadsheets stored in Google Drive.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      id="modal-google-signin-btn"
                      onClick={onGoogleSignIn}
                      className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                    >
                      Sign in with Google
                    </button>
                    <button
                      id="modal-load-sample-btn"
                      onClick={() => {
                        onLoadSampleData();
                        onClose();
                      }}
                      className="px-4 py-2 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition-colors"
                    >
                      Use Demo Sales Dataset
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Quick Creation Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
                          <PlusCircle className="w-4 h-4 text-emerald-600" />
                          Kenyan Pub Sales Sheet (Google Drive)
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Creates a live spreadsheet in your Google Drive with Kenyan pub sales (Tusker Lager, White Cap, Nyama Choma, Gilbeys Gin, EABL distributor lead times).
                        </p>
                      </div>
                      <button
                        id="modal-create-demo-sheet-btn"
                        onClick={onCreateDemoSheet}
                        disabled={isCreatingDemo}
                        className="mt-3 w-full py-1.5 px-3 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isCreatingDemo ? 'Creating...' : 'Create Pub Sheet in Drive'}
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                          <Database className="w-4 h-4 text-slate-600" />
                          Local Kenyan Pub Sample Data
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Instantly test analytics, AI Q&amp;A, and inventory forecasting using simulated Nairobi pub sales, beers, choma kitchen, and spirit orders.
                        </p>
                      </div>
                      <button
                        id="modal-use-sample-local-btn"
                        onClick={() => {
                          onLoadSampleData();
                          onClose();
                        }}
                        className="mt-3 w-full py-1.5 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        Load Pub Sample Data
                      </button>
                    </div>
                  </div>

                  {/* Manual URL / ID input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Or Open via Spreadsheet URL / ID
                    </label>
                    <form onSubmit={handleLoadCustom} className="flex gap-2">
                      <input
                        id="custom-sheet-url-input"
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XR..."
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={customLoading || !customInput.trim()}
                        className="px-3.5 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {customLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        Open
                      </button>
                    </form>
                    {customError && (
                      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {customError}
                      </p>
                    )}
                  </div>

                  {/* Drive Spreadsheets List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Your Google Drive Spreadsheets
                      </h3>
                      <button
                        onClick={loadDriveFiles}
                        disabled={loadingDrive}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingDrive ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>

                    {/* Search filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filter by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {driveError && (
                      <p className="text-xs text-rose-600 p-2 bg-rose-50 rounded-lg">
                        {driveError}
                      </p>
                    )}

                    <div className="max-h-56 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
                      {loadingDrive ? (
                        <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          Loading spreadsheets from Google Drive...
                        </div>
                      ) : filteredFiles.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          {searchQuery
                            ? 'No spreadsheets matching search.'
                            : 'No spreadsheets found in Drive. Create a demo sheet above!'}
                        </div>
                      ) : (
                        filteredFiles.map((file) => {
                          const isCurrent = file.id === currentSpreadsheetId;
                          return (
                            <div
                              key={file.id}
                              className={`pt-1.5 flex items-center justify-between p-2 rounded-lg transition-colors ${
                                isCurrent ? 'bg-emerald-50/60 border border-emerald-200' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-800 truncate" title={file.name}>
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {file.modifiedTime
                                      ? `Modified ${new Date(file.modifiedTime).toLocaleDateString()}`
                                      : 'Google Sheet'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                    title="Open in Drive"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handlePickFile(file.id)}
                                  className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                                >
                                  Select
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Google Sheets API v4 Connected</span>
          <button
            onClick={() => {
              setPendingDetails(null);
              onClose();
            }}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
