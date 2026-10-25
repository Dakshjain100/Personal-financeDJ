import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { DEFAULT_SECURITY_QUESTIONS } from '../utils/securityCrypto';
import { ShieldCheck, X, CheckCircle2, AlertCircle, KeyRound, User, Lock } from 'lucide-react';

interface SecuritySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResetModal?: () => void;
}

export const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenResetModal
}) => {
  const {
    userId,
    securityQuestion,
    updateSecurityProfile,
    lockVault
  } = useSecurity();

  const [editUserId, setEditUserId] = useState(userId);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinToggle, setChangePinToggle] = useState(false);
  const [changeQuestionToggle, setChangeQuestionToggle] = useState(false);
  const [newQuestion, setNewQuestion] = useState(securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]);
  const [newAnswer, setNewAnswer] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!currentPin.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your current PIN to authorize changes.' });
      return;
    }

    if (changePinToggle) {
      if (!/^\d{4,6}$/.test(newPin)) {
        setStatusMessage({ type: 'error', text: 'New PIN must be 4, 5, or 6 numeric digits.' });
        return;
      }
      if (newPin !== confirmNewPin) {
        setStatusMessage({ type: 'error', text: 'New PIN confirmation does not match.' });
        return;
      }
    }

    if (changeQuestionToggle && !newAnswer.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter an answer for your new security question.' });
      return;
    }

    setIsProcessing(true);
    const res = await updateSecurityProfile(
      editUserId,
      currentPin,
      changePinToggle ? newPin : undefined,
      changeQuestionToggle ? newQuestion : undefined,
      changeQuestionToggle ? newAnswer : undefined
    );

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Security settings updated successfully!' });
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setNewAnswer('');
      setChangePinToggle(false);
      setChangeQuestionToggle(false);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to update security profile.' });
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Vault Security Settings</h3>
              <p className="text-xs text-slate-400">Manage your user ID, security PIN, and recovery question</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {statusMessage && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border border-red-500/40 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* User ID */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              User ID / Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                required
                value={editUserId}
                onChange={e => setEditUserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Current PIN verification */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Current Security PIN (Required to save changes)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                value={currentPin}
                onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono tracking-widest"
              />
            </div>
          </div>

          {/* Change PIN Accordion Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setChangePinToggle(!changePinToggle)}
              className="flex items-center justify-between w-full text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>{changePinToggle ? 'Cancel Changing PIN' : '+ Change Security PIN'}</span>
              </span>
            </button>

            {changePinToggle && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    New PIN (4–6 digits)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-center tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Confirm New PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={e => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono text-center tracking-widest"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Change Security Question Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setChangeQuestionToggle(!changeQuestionToggle)}
              className="flex items-center justify-between w-full text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer py-1"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{changeQuestionToggle ? 'Cancel Changing Security Question' : '+ Update Security Question'}</span>
              </span>
            </button>

            {changeQuestionToggle && (
              <div className="space-y-2.5 mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Question
                  </label>
                  <select
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    {DEFAULT_SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    New Answer
                  </label>
                  <input
                    type="text"
                    value={newAnswer}
                    onChange={e => setNewAnswer(e.target.value)}
                    placeholder="Enter new answer..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  lockVault();
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl transition-colors cursor-pointer"
              >
                Lock Vault
              </button>

              {onOpenResetModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenResetModal();
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl transition-colors cursor-pointer"
                >
                  Wipe Data & Reset...
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
