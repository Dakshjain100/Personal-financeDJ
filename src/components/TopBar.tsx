import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { useSecurity } from '../context/SecurityContext';
import { Plus, Lock, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  onOpenAddModal: () => void;
  onOpenExcelSync: () => void;
  onOpenSecuritySettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenAddModal,
  onOpenExcelSync,
  onOpenSecuritySettings
}) => {
  const {
    activeTab,
    setActiveTab,
    isExcelLinked,
    linkedExcelName,
    isGSheetLinked,
    linkedGSheetTitle
  } = useFinance();

  const { lockVault, userId, isConfigured } = useSecurity();

  const isAnySyncActive = isGSheetLinked || isExcelLinked;
  const syncLabel = isGSheetLinked
    ? (linkedGSheetTitle ? `Sheets: ${linkedGSheetTitle.slice(0, 14)}...` : 'Sheets Connected')
    : isExcelLinked
    ? (linkedExcelName ? `Excel: ${linkedExcelName.slice(0, 14)}...` : 'Excel Linked')
    : 'Sheets & Excel Sync';

  const syncTooltip = isGSheetLinked
    ? `Google Sheets Linked: ${linkedGSheetTitle || 'Connected'}`
    : isExcelLinked
    ? `Local Excel Linked: ${linkedExcelName}`
    : 'Import Excel file, connect Google Sheets, or paste rows';

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">
              Rupee<span className="text-emerald-400">Flow</span>
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline tabular-nums">
              Oct 2026
            </span>
          </div>

          {/* Zone 2: 4 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`transition-colors whitespace-nowrap cursor-pointer pb-1 border-b-2 ${
                activeTab === 'dashboard'
                  ? 'border-emerald-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard & Cash Flow
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`transition-colors whitespace-nowrap cursor-pointer pb-1 border-b-2 ${
                activeTab === 'ledger'
                  ? 'border-emerald-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Transaction Ledger
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`transition-colors whitespace-nowrap cursor-pointer pb-1 border-b-2 ${
                activeTab === 'accounts'
                  ? 'border-emerald-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Bank & Cash Accounts
            </button>
          </nav>

          {/* Zone 3: 1 primary action + Security Controls + Sync affordance */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Lock Vault Button */}
            {isConfigured && (
              <button
                onClick={lockVault}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 transition-colors cursor-pointer"
                title="Lock Vault Now (Auto-locks after 15m inactivity)"
                aria-label="Lock Vault"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline text-[11px]">Lock</span>
              </button>
            )}

            {/* Vault Settings Button */}
            {isConfigured && (
              <button
                onClick={onOpenSecuritySettings}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
                title={`Vault Security Settings (${userId || 'User'})`}
                aria-label="Vault Settings"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {/* Sheets & Excel Sync Button */}
            <button
              onClick={onOpenExcelSync}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isAnySyncActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={syncTooltip}
            >
              <span className={`w-2 h-2 rounded-full ${isAnySyncActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="hidden sm:inline">{syncLabel}</span>
              <span className="sm:hidden">{isAnySyncActive ? 'Synced' : 'Sync'}</span>
            </button>

            {/* Primary Action Button: Log Transaction */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-emerald-950/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Tabs */}
      <div className="flex md:hidden border-t border-slate-800/80 px-4 py-2 gap-4 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-md ${
            activeTab === 'dashboard' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-md ${
            activeTab === 'ledger' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Ledger
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`whitespace-nowrap px-3 py-1.5 rounded-md ${
            activeTab === 'accounts' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'
          }`}
        >
          Accounts
        </button>
      </div>
    </header>
  );
};
