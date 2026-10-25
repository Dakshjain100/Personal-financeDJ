import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType } from '../types/finance';
import { formatCurrencyValue, formatINR } from '../utils/formatters';
import { Building2, Plus, Edit2, Check, X, ShieldAlert } from 'lucide-react';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({ isOpen, onClose }) => {
  const { accounts, accountBalances, updateAccount, addAccount, isPrivacyActive } = useFinance();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editInitialBalance, setEditInitialBalance] = useState('');
  const [editType, setEditType] = useState<string>('Saving');

  // New account form
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('Saving');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [newLast4, setNewLast4] = useState('');

  const typeSuggestions = [
    'Saving',
    'Current',
    'Cash',
    'Savings Bucket',
    'Emergency Fund',
    'Fixed Deposit',
    'Demat / Stocks',
    'Credit Card',
    'Salary Account'
  ];

  if (!isOpen) return null;

  const handleStartEdit = (acc: Account) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditType(acc.type || 'Saving');
    setEditInitialBalance(acc.initial_balance.toString());
  };

  const handleSaveEdit = (id: string) => {
    const parsed = parseFloat(editInitialBalance);
    updateAccount(id, {
      name: editName.trim(),
      type: editType.trim() || 'Saving',
      initial_balance: isNaN(parsed) ? 0 : parsed,
    });
    setEditingId(null);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const parsed = parseFloat(newInitialBalance);
    addAccount({
      name: newName.trim(),
      type: newType.trim() || 'Saving',
      initial_balance: isNaN(parsed) ? 0 : parsed,
      is_active: true,
      account_number_last4: newLast4.trim() ? newLast4.trim().slice(-4) : undefined,
    });

    setNewName('');
    setNewType('Saving');
    setNewInitialBalance('');
    setNewLast4('');
    setIsAddingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <span>Accounts & Custom Account Types</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit account types (Saving, Current, or any custom label) and baseline opening balances
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Account List Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Custom Type</th>
                  <th className="py-2.5 px-3 text-right">Initial Balance (₹)</th>
                  <th className="py-2.5 px-3 text-right">Live Balance (₹)</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {accounts.map(acc => {
                  const isEditing = editingId === acc.id;
                  const bal = accountBalances[acc.id]?.tillDate || 0;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{acc.name}</span>
                            {acc.account_number_last4 && (
                              <span className="text-[10px] font-mono text-slate-400">
                                ••{acc.account_number_last4}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              list="type-suggestions-edit"
                              value={editType}
                              placeholder="e.g. Saving, Current, Wallet..."
                              onChange={e => setEditType(e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-32 focus:ring-1 focus:ring-emerald-400"
                            />
                            <datalist id="type-suggestions-edit">
                              {typeSuggestions.map(s => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50">
                            {acc.type}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editInitialBalance}
                            onChange={e => setEditInitialBalance(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right w-24"
                          />
                        ) : (
                          formatCurrencyValue(acc.initial_balance, isPrivacyActive, true)
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 tabular-nums">
                        {formatCurrencyValue(bal, isPrivacyActive, true)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSaveEdit(acc.id)}
                              className="p-1 text-emerald-400 hover:bg-slate-700 rounded cursor-pointer"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-700 rounded cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(acc)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Edit account type & opening balance"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add New Account Section */}
          {isAddingNew ? (
            <form onSubmit={handleCreateAccount} className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white">Add New Account</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kotak Mahindra, Zerodha, ICICI"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400">Account Type (Custom)</label>
                    <span className="text-[10px] text-emerald-400/80">type anything</span>
                  </div>
                  <input
                    type="text"
                    list="type-suggestions-new"
                    required
                    placeholder="e.g. Saving, Current, or anything"
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-400"
                  />
                  <datalist id="type-suggestions-new">
                    {typeSuggestions.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Saving', 'Current', 'Cash', 'Savings Bucket', 'Emergency Fund'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewType(preset)}
                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                          newType === preset
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Opening Baseline (INR ₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={newInitialBalance}
                    onChange={e => setNewInitialBalance(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Last 4 Digits (Optional)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="4123"
                    value={newLast4}
                    onChange={e => setNewLast4(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-400 text-slate-950 rounded-lg hover:bg-emerald-300 cursor-pointer"
                >
                  Add Account
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Bank / Cash Account</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
