/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import { TopBar } from './components/TopBar';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { AccountLiquidityGrid } from './components/AccountLiquidityGrid';
import { MonthlyCashFlowTable } from './components/MonthlyCashFlowTable';
import { ExpenseCategoryBreakdown } from './components/ExpenseCategoryBreakdown';
import { PortfolioAllocation } from './components/PortfolioAllocation';
import { TransactionLedger } from './components/TransactionLedger';
import { TransactionModal } from './components/TransactionModal';
import { AccountsModal } from './components/AccountsModal';
import { ExcelSyncModal } from './components/ExcelSyncModal';
import { VaultLockModal } from './components/VaultLockModal';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { Transaction } from './types/finance';
import { Plus, Building2, SlidersHorizontal, ArrowRightLeft } from 'lucide-react';
import { formatCurrencyValue } from './utils/formatters';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, accounts, accountBalances, isPrivacyActive, setFilterProp } = useFinance();
  const { isLocked } = useSecurity();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isExcelSyncOpen, setIsExcelSyncOpen] = useState(false);
  const [isSecuritySettingsOpen, setIsSecuritySettingsOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [quickTransferFromAccount, setQuickTransferFromAccount] = useState<string | undefined>(undefined);

  const handleOpenAddModal = (fromAccountId?: string) => {
    setEditingTransaction(null);
    setQuickTransferFromAccount(fromAccountId);
    setIsAddModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setQuickTransferFromAccount(undefined);
    setIsAddModalOpen(true);
  };

  const handleCategorySelectFromAnalytics = (categoryId: string) => {
    setFilterProp('selectedCategoryId', categoryId);
    setActiveTab('ledger');
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${isLocked ? 'overflow-hidden filter blur-[2px] pointer-events-none select-none' : ''}`}>
      {/* Top Bar with 3-Zone Contract */}
      <TopBar
        onOpenAddModal={() => handleOpenAddModal()}
        onOpenExcelSync={() => setIsExcelSyncOpen(true)}
        onOpenSecuritySettings={() => setIsSecuritySettingsOpen(true)}
      />

      {/* Control & Time Filter Bar with Code-Protected Reset */}
      <FilterBar onOpenResetModal={() => setIsResetModalOpen(true)} />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Primary KPI Cards */}
            <KpiCards />

            {/* Account Liquidity Bank Grid */}
            <AccountLiquidityGrid onQuickTransfer={handleOpenAddModal} />

            {/* Split Analytical View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: 12-Month Rolling Cash Flow Table */}
              <div className="lg:col-span-7 h-full">
                <MonthlyCashFlowTable />
              </div>

              {/* Right Column: Expense Category Breakdown & Burn Rate */}
              <div className="lg:col-span-5 h-full">
                <ExpenseCategoryBreakdown onSelectCategory={handleCategorySelectFromAnalytics} />
              </div>
            </div>

            {/* Financial Allocation & Portfolio Capital Distribution */}
            <PortfolioAllocation />
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <TransactionLedger
              onOpenAddModal={() => handleOpenAddModal()}
              onEditTransaction={handleEditTransaction}
              onOpenExcelSync={() => setIsExcelSyncOpen(true)}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span>Financial Accounts & Baseline Balances</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Multi-account ledger baselines, opening balances, and real-time reconciliation
                </p>
              </div>
              <button
                onClick={() => setIsAccountsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Manage Accounts & Openings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(acc => {
                const bal = accountBalances[acc.id] || { current: 0, tillDate: 0, dayNet: 0 };
                return (
                  <div
                    key={acc.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-bold text-white">{acc.name}</h3>
                          <span className="text-xs text-slate-400 font-mono">
                            {acc.type}
                            {acc.account_number_last4 ? ` · ••${acc.account_number_last4}` : ''}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {acc.is_active ? 'Active' : 'Archived'}
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="flex justify-between text-slate-400">
                          <span>Opening Baseline:</span>
                          <span className="font-mono text-slate-300 tabular-nums">
                            {formatCurrencyValue(acc.initial_balance, isPrivacyActive, true)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Till Date Cumulative:</span>
                          <span className="font-mono font-bold text-emerald-400 tabular-nums">
                            {formatCurrencyValue(bal.tillDate, isPrivacyActive, true)}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Day Net Movement:</span>
                          <span
                            className={`font-mono tabular-nums ${
                              bal.dayNet > 0
                                ? 'text-emerald-400'
                                : bal.dayNet < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {bal.dayNet > 0 ? '+' : ''}
                            {formatCurrencyValue(bal.dayNet, isPrivacyActive, true)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => handleOpenAddModal(acc.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Transfer from {acc.name}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) on Mobile */}
      <div className="fixed right-5 bottom-5 z-40 md:hidden">
        <button
          onClick={() => handleOpenAddModal()}
          className="w-13 h-13 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-950/40 cursor-pointer transition-transform active:scale-95"
          aria-label="Add transaction"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Transaction Entry & Edit Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        editingTransaction={editingTransaction}
        defaultFromAccountId={quickTransferFromAccount}
      />

      {/* Accounts & Baseline Balances Modal */}
      <AccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
      />

      {/* Excel Import & Two-Way Sync Modal */}
      <ExcelSyncModal
        isOpen={isExcelSyncOpen}
        onClose={() => setIsExcelSyncOpen(false)}
      />

      {/* Vault Security Settings Modal */}
      <SecuritySettingsModal
        isOpen={isSecuritySettingsOpen}
        onClose={() => setIsSecuritySettingsOpen(false)}
        onOpenResetModal={() => setIsResetModalOpen(true)}
      />

      {/* Security Code-Protected Reset Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />

      {/* Fullscreen Vault Lock Screen Modal */}
      <VaultLockModal onOpenResetModal={() => setIsResetModalOpen(true)} />
    </div>
  );
};

export default function App() {
  return (
    <SecurityProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </SecurityProvider>
  );
}
