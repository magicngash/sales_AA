import React from 'react';
import {
  FileSpreadsheet,
  Bot,
  Sparkles,
  AlertTriangle,
  Table,
  LogOut,
  ExternalLink,
  PlusCircle,
  FolderOpen
} from 'lucide-react';
import { UserProfile, SpreadsheetDetails } from '../types';

interface HeaderProps {
  user: UserProfile | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  activeTab: 'dashboard' | 'qa' | 'reports' | 'inventory' | 'table';
  setActiveTab: (tab: 'dashboard' | 'qa' | 'reports' | 'inventory' | 'table') => void;
  currentSpreadsheet: SpreadsheetDetails | null;
  selectedSheetTitle: string;
  onOpenSheetSelector: () => void;
  onCreateDemoSheet: () => void;
  isCreatingDemo: boolean;
  criticalAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  activeTab,
  setActiveTab,
  currentSpreadsheet,
  selectedSheetTitle,
  onOpenSheetSelector,
  onCreateDemoSheet,
  isCreatingDemo,
  criticalAlertsCount,
}) => {
  return (
    <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top tier */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                Sales Sheets AI
              </h1>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Inventory Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Automated Reports &bull; Sales Q&amp;A &bull; Inventory Replenishment Insights
            </p>
          </div>
        </div>

        {/* Current Active Sheet & Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {currentSpreadsheet ? (
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-3 gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-500">Sheet:</span>
              <span className="font-medium text-slate-800 max-w-[180px] truncate" title={currentSpreadsheet.title}>
                {currentSpreadsheet.title}
              </span>
              <span className="text-slate-400">/</span>
              <span className="font-semibold text-slate-700">{selectedSheetTitle}</span>
              <a
                id="view-live-sheet-btn"
                href={currentSpreadsheet.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-600 transition-colors ml-1 p-0.5"
                title="Open spreadsheet in Google Sheets"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                id="switch-sheet-btn"
                onClick={onOpenSheetSelector}
                className="ml-2 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded px-2 py-0.5 hover:bg-slate-50 transition-colors"
              >
                Switch
              </button>
            </div>
          ) : (
            <button
              id="select-sheet-cta-btn"
              onClick={onOpenSheetSelector}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-slate-500" />
              Choose Google Sheet
            </button>
          )}

          {user && (
            <button
              id="create-demo-template-btn"
              onClick={onCreateDemoSheet}
              disabled={isCreatingDemo}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              title="Create a sample sales spreadsheet in your Google Drive"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              {isCreatingDemo ? 'Creating Sheet...' : 'New Demo Sheet in Drive'}
            </button>
          )}

          {/* User auth badge / Google Sign-In */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-slate-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-semibold text-xs flex items-center justify-center">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left text-xs leading-tight">
                <p className="font-medium text-slate-800 truncate max-w-[130px]">
                  {user.displayName || user.email}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">Sheets Connected</p>
              </div>
              <button
                id="sign-out-btn"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded"
                title="Sign out of Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="google-signin-btn"
              onClick={onLogin}
              disabled={isLoggingIn}
              className="gsi-material-button text-xs inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-shadow shadow-2xs disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoggingIn ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
        <button
          id="nav-tab-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Dashboard &amp; Overview
        </button>

        <button
          id="nav-tab-qa"
          onClick={() => setActiveTab('qa')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'qa'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          Ask Sales AI
        </button>

        <button
          id="nav-tab-reports"
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'reports'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Automated Reports
        </button>

        <button
          id="nav-tab-inventory"
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap relative ${
            activeTab === 'inventory'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Inventory Intelligence
          {criticalAlertsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
              {criticalAlertsCount}
            </span>
          )}
        </button>

        <button
          id="nav-tab-table"
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === 'table'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          Live Sheet Data
        </button>
      </div>
    </header>
  );
};
