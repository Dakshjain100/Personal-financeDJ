import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { useSecurity } from '../context/SecurityContext';
import { Trash2, AlertTriangle, Lock, CheckCircle2, X, AlertCircle, ShieldAlert } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ isOpen, onClose }) => {
  const { wipeAllLedgerData, transactions } = useFinance();
  const { isConfigured, verifyPin, resetVaultCompletely, pinLength } = useSecurity();

  const [resetType, setResetType] = useState<'DATA_ONLY' | 'FACTORY_RESET'>('DATA_ONLY');
  const [pinCode, setPinCode] = useState('');
  const [confirmationWord, setConfirmationWord] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If vault is configured, verify user's PIN code
    if (isConfigured) {
      if (!pinCode.trim()) {
        setErrorMessage('Please enter your Security PIN / Code to authorize data wipe.');
        return;
      }

      setIsProcessing(true);
      const isCodeValid = await verifyPin(pinCode);

      if (!isCodeValid) {
        setIsProcessing(false);
        setErrorMessage('Incorrect Security Code. Data reset denied.');
        setPinCode('');
        return;
      }
    } else {
      // If no PIN vault configured, require typing RESET
      if (confirmationWord.trim().toUpperCase() !== 'RESET') {
        setErrorMessage('Please type RESET in capital letters to confirm.');
        return;
      }
      setIsProcessing(true);
    }

    // Perform actual data wipe out of the app
    wipeAllLedgerData();

    if (resetType === 'FACTORY_RESET') {
      resetVaultCompletely();
    }

    setIsProcessing(false);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      setPinCode('');
      setConfirmationWord('');
      onClose();
    }, 1500);
  };

  const handleModalClose = () => {
    if (isProcessing) return;
    setErrorMessage(null);
    setPinCode('');
    setConfirmationWord('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-red-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Reset Application Data
              </h3>
              <p className="text-xs text-red-400/90 font-medium">
                Authorization required to wipe ledger
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">All Data Wiped Successfully</h4>
            <p className="text-xs text-slate-300">
              All transactions and account balances have been permanently removed from the application.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="p-6 space-y-4">
            {/* Warning Text */}
            <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5 text-red-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>All {transactions.length} transactions will be removed out of the app.</span>
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This will wipe the transaction ledger, set account opening balances to ₹0, and unlink any connected Google Sheet or Excel workbook.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 bg-red-950/50 border border-red-500/50 rounded-xl text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Reset Scope Selection */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-medium text-slate-300">
                Choose Reset Scope:
              </label>
              <div className="space-y-2">
                <label
                  onClick={() => setResetType('DATA_ONLY')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    resetType === 'DATA_ONLY'
                      ? 'bg-slate-800/90 border-emerald-500/40 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetType"
                    checked={resetType === 'DATA_ONLY'}
                    onChange={() => setResetType('DATA_ONLY')}
                    className="mt-0.5 text-emerald-400 focus:ring-emerald-400"
                  />
                  <div>
                    <span className="text-xs font-semibold block text-slate-200">
                      Wipe Ledger & Financial Data Only (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Clears all transactions and balances to 0, but preserves your Security ID and PIN login.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setResetType('FACTORY_RESET')}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    resetType === 'FACTORY_RESET'
                      ? 'bg-slate-800/90 border-red-500/40 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="resetType"
                    checked={resetType === 'FACTORY_RESET'}
                    onChange={() => setResetType('FACTORY_RESET')}
                    className="mt-0.5 text-red-400 focus:ring-red-400"
                  />
                  <div>
                    <span className="text-xs font-semibold block text-slate-200">
                      Complete Factory Reset
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Wipes all transactions, accounts, AND resets the security vault so the app starts fresh.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Security Code Verification Input */}
            <div className="pt-2 border-t border-slate-800">
              {isConfigured ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Enter Your Security PIN / Code to Authorize:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      autoFocus
                      maxLength={6}
                      value={pinCode}
                      onChange={e => setPinCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-mono tracking-widest"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Your {pinLength}-digit security code is required before any data can be wiped.
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Type RESET to Confirm:
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={confirmationWord}
                    onChange={e => setConfirmationWord(e.target.value)}
                    placeholder="RESET"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-mono tracking-wider"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-red-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Verifying & Wiping...' : 'Authorize & Wipe Data'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
