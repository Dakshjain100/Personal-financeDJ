import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import { formatINR, toISODateString } from '../utils/formatters';
import { X, ArrowRightLeft, Check, AlertCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  defaultFromAccountId?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  editingTransaction,
  defaultFromAccountId,
}) => {
  const { accounts, categories, addTransaction, updateTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>('Expense');
  const [date, setDate] = useState<string>(() => toISODateString(new Date(2026, 9, 25)));
  const [amount, setAmount] = useState<string>('');
  const [fromAccount, setFromAccount] = useState<string>('');
  const [toAccount, setToAccount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset state when modal opens or editingTransaction changes
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDate(editingTransaction.date);
      setAmount(editingTransaction.amount.toString());
      setFromAccount(editingTransaction.from_account);
      setToAccount(editingTransaction.to_account || '');
      setCategoryId(editingTransaction.category_id);
      setNotes(editingTransaction.notes || '');
      setError(null);
    } else {
      setType(defaultFromAccountId ? 'Transfer' : 'Expense');
      setDate('2026-10-25');
      setAmount('');
      setFromAccount(defaultFromAccountId || accounts[0]?.id || '');
      
      // Default to_account different from from_account
      const otherAccount = accounts.find(a => a.id !== (defaultFromAccountId || accounts[0]?.id));
      setToAccount(otherAccount?.id || '');

      // Default category for Expense
      const defaultCat = categories.find(c => c.classification === 'EXPENSE');
      setCategoryId(defaultCat?.id || categories[0]?.id || '');
      setNotes('');
      setError(null);
    }
  }, [editingTransaction, isOpen, defaultFromAccountId, accounts, categories]);

  if (!isOpen) return null;

  // Filter categories based on transaction type
  const relevantCategories = categories.filter(c => {
    if (type === 'Expense') return c.classification === 'EXPENSE';
    if (type === 'Income') return c.classification === 'INCOME';
    if (type === 'Transfer') return c.classification === 'SYSTEM' || c.name === 'Transfer';
    if (type === 'Savings') return c.classification === 'EXPENSE' || c.name.includes('Future') || c.name === 'Transfer';
    return true;
  });

  const parsedAmount = parseFloat(amount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidAmount) {
      setError('Please specify a positive transaction amount.');
      return;
    }

    if (!fromAccount) {
      setError('Please select the originating account.');
      return;
    }

    if (type === 'Transfer') {
      if (!toAccount) {
        setError('Please select a destination account for the transfer.');
        return;
      }
      if (toAccount === fromAccount) {
        setError('Source and Destination accounts must be different for a transfer.');
        return;
      }
    }

    let finalCategoryId = categoryId;
    if (type === 'Transfer') {
      const transferCat = categories.find(c => c.name === 'Transfer');
      finalCategoryId = transferCat?.id || categoryId || categories[0]?.id;
    }

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        date,
        type,
        amount: parsedAmount,
        from_account: fromAccount,
        to_account: type === 'Transfer' ? toAccount : null,
        category_id: finalCategoryId,
        notes: notes.trim(),
      });
    } else {
      addTransaction({
        date,
        type,
        amount: parsedAmount,
        from_account: fromAccount,
        to_account: type === 'Transfer' ? toAccount : null,
        category_id: finalCategoryId,
        notes: notes.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {editingTransaction ? 'Edit Transaction' : 'Record Transaction'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Atomic double-entry transaction logger with instant balance reconciliation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Transaction Type Segmented Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700/80">
              {(['Expense', 'Income', 'Transfer', 'Savings'] as const).map(t => {
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      // Auto-switch relevant category
                      if (t === 'Expense') {
                        const defaultExp = categories.find(c => c.classification === 'EXPENSE');
                        if (defaultExp) setCategoryId(defaultExp.id);
                      } else if (t === 'Income') {
                        const defaultInc = categories.find(c => c.classification === 'INCOME');
                        if (defaultInc) setCategoryId(defaultInc.id);
                      }
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? t === 'Expense'
                          ? 'bg-rose-500 text-white shadow-sm'
                          : t === 'Income'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : t === 'Transfer'
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Field with INR Auto-Mask Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Amount (INR ₹)
              </label>
              {isValidAmount && (
                <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                  {formatINR(parsedAmount)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-2 text-sm text-white font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Effective Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            />
          </div>

          {/* Account Fields (Dynamic based on Transfer vs Other) */}
          {type === 'Transfer' ? (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  From Account (Source)
                </label>
                <select
                  value={fromAccount}
                  onChange={e => setFromAccount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <ArrowRightLeft className="w-3 h-3 text-indigo-400" />
                  <span>To Account (Destination)</span>
                </label>
                <select
                  value={toAccount}
                  onChange={e => setToAccount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === fromAccount}>
                      {acc.name} {acc.id === fromAccount ? '(Source)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account
                </label>
                <select
                  value={fromAccount}
                  onChange={e => setFromAccount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                >
                  {relevantCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Notes / Description Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Memo / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly rent, Whole Foods, SIP contribution..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingTransaction ? 'Save Changes' : 'Confirm Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
