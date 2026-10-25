import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrencyValue, exportTransactionsToCSV, downloadFile, formatDisplayDate } from '../utils/formatters';
import { Transaction, TransactionType } from '../types/finance';
import {
  Search,
  Download,
  Trash2,
  Edit2,
  ArrowRight,
  Filter,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';

interface TransactionLedgerProps {
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenExcelSync?: () => void;
}

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  onOpenAddModal,
  onEditTransaction,
  onOpenExcelSync,
}) => {
  const {
    filteredTransactions,
    accounts,
    categories,
    deleteTransaction,
    isPrivacyActive,
    filters,
    setFilterProp,
    isExcelLinked,
  } = useFinance();

  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Sorting
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortOrder === 'desc' ? diff : -diff;
      }
      if (sortField === 'amount') {
        const diff = b.amount - a.amount;
        return sortOrder === 'desc' ? diff : -diff;
      }
      return 0;
    });
  }, [filteredTransactions, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Handle Export to CSV
  const handleExportCSV = () => {
    const dataForExport = sortedTransactions.map(t => ({
      date: t.date,
      day: t.day,
      month_period: t.month_period,
      type: t.type,
      amount: t.amount,
      categoryName: categoryMap.get(t.category_id)?.name || 'N/A',
      fromAccountName: accountMap.get(t.from_account)?.name || 'N/A',
      toAccountName: t.to_account ? accountMap.get(t.to_account)?.name || '' : '',
      notes: t.notes || '',
    }));

    const csvContent = exportTransactionsToCSV(dataForExport);
    const filename = `rupeeflow_transactions_${filters.year}_${filters.month}_${Date.now()}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  };

  const handleTypeSelect = (type: TransactionType | 'ALL') => {
    setFilterProp('selectedType', type);
    setCurrentPage(1);
  };

  const getTypeStyle = (type: TransactionType) => {
    switch (type) {
      case 'Income':
        return 'text-emerald-400';
      case 'Expense':
        return 'text-rose-400';
      case 'Transfer':
        return 'text-indigo-400';
      case 'Savings':
        return 'text-cyan-400';
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden flex flex-col">
      {/* Ledger Header & Search Controls */}
      <div className="p-4 border-b border-slate-700/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Double-Entry Transaction Ledger</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {sortedTransactions.length} recorded transactions across filtered accounts
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenExcelSync && (
              <button
                onClick={onOpenExcelSync}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  isExcelLinked
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-700/60 hover:bg-slate-700 text-slate-200 border-slate-600/60'
                }`}
                title="Import Excel or configure two-way file sync"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel Sync & Import</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-200 border border-slate-600/60 transition-colors cursor-pointer"
              title="Download CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search memo, category, amount..."
              value={filters.searchQuery}
              onChange={e => {
                setFilterProp('searchQuery', e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={filters.selectedAccountId}
              onChange={e => {
                setFilterProp('selectedAccountId', e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="ALL">All Accounts (BOI, HDFC, SBI, Axis, Cash...)</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filters.selectedCategoryId}
              onChange={e => {
                setFilterProp('selectedCategoryId', e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.classification})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter Segment */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-700 text-xs overflow-x-auto">
            {(['ALL', 'Expense', 'Income', 'Transfer', 'Savings'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleTypeSelect(t)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filters.selectedType === t
                    ? 'bg-slate-700 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/70 text-slate-400 font-semibold border-b border-slate-700/80 sticky top-0">
              <th
                className="py-3 px-4 cursor-pointer hover:text-slate-200"
                onClick={() => {
                  if (sortField === 'date') {
                    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
                  } else {
                    setSortField('date');
                    setSortOrder('desc');
                  }
                }}
              >
                Date {sortField === 'date' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Type</th>
              <th
                className="py-3 px-4 text-right cursor-pointer hover:text-slate-200"
                onClick={() => {
                  if (sortField === 'amount') {
                    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
                  } else {
                    setSortField('amount');
                    setSortOrder('desc');
                  }
                }}
              >
                Amount (₹) {sortField === 'amount' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
              </th>
              <th className="py-3 px-4">From Account</th>
              <th className="py-3 px-4">To / Destination</th>
              <th className="py-3 px-4">Memo / Notes</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 text-slate-200">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Filter className="w-6 h-6 text-slate-500" />
                    <span>No transactions match the current filter criteria.</span>
                    <button
                      onClick={() => {
                        setFilterProp('searchQuery', '');
                        setFilterProp('selectedAccountId', 'ALL');
                        setFilterProp('selectedCategoryId', 'ALL');
                        setFilterProp('selectedType', 'ALL');
                      }}
                      className="text-xs text-emerald-400 hover:underline mt-1 cursor-pointer"
                    >
                      Clear ledger filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map(tx => {
                const category = categoryMap.get(tx.category_id);
                const fromAccount = accountMap.get(tx.from_account);
                const toAccount = tx.to_account ? accountMap.get(tx.to_account) : null;

                const isExpense = tx.type === 'Expense';
                const isIncome = tx.type === 'Income';

                return (
                  <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                    {/* Date */}
                    <td className="py-2.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {formatDisplayDate(tx.date)}
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-4 font-medium text-slate-200 whitespace-nowrap">
                      {category?.name || 'Uncategorized'}
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={`font-semibold ${getTypeStyle(tx.type)}`}>
                        {tx.type}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                      <span
                        className={
                          isIncome
                            ? 'text-emerald-400'
                            : isExpense
                            ? 'text-rose-400'
                            : 'text-indigo-300'
                        }
                      >
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {formatCurrencyValue(tx.amount, isPrivacyActive)}
                      </span>
                    </td>

                    {/* From Account */}
                    <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap font-medium">
                      {fromAccount?.name || '—'}
                    </td>

                    {/* To Account (for Transfers) */}
                    <td className="py-2.5 px-4 text-slate-300 whitespace-nowrap">
                      {toAccount ? (
                        <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span>{toAccount.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Memo */}
                    <td className="py-2.5 px-4 text-slate-400 max-w-xs truncate" title={tx.notes || ''}>
                      {tx.notes || '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditTransaction(tx)}
                          className="p-1 text-slate-400 hover:text-emerald-300 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this transaction?')) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-700/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedTransactions.length)} of{' '}
            {sortedTransactions.length} records
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
