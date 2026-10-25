import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { DEFAULT_SECURITY_QUESTIONS } from '../utils/securityCrypto';
import { ShieldCheck, Lock, Unlock, KeyRound, AlertCircle, CheckCircle2, Delete, RotateCcw, ArrowRight, User, HelpCircle } from 'lucide-react';

interface VaultLockModalProps {
  onOpenResetModal?: () => void;
}

export const VaultLockModal: React.FC<VaultLockModalProps> = ({ onOpenResetModal }) => {
  const {
    isConfigured,
    isLocked,
    userId,
    securityQuestion,
    pinLength: configuredPinLength,
    failedAttempts,
    isRateLimited,
    rateLimitCountdown,
    setupVault,
    unlockVault,
    verifySecurityAnswer,
    resetPin,
  } = useSecurity();

  // Mode: 'UNLOCK' | 'SETUP' | 'RECOVERY' | 'SET_NEW_PIN'
  const [mode, setMode] = useState<'UNLOCK' | 'SETUP' | 'RECOVERY' | 'SET_NEW_PIN'>(() => {
    return isConfigured ? 'UNLOCK' : 'SETUP';
  });

  useEffect(() => {
    if (!isConfigured) {
      setMode('SETUP');
    } else if (isLocked && mode === 'SETUP') {
      setMode('UNLOCK');
    }
  }, [isConfigured, isLocked, mode]);

  // UNLOCK STATE
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // SETUP STATE
  const [setupUserId, setSetupUserId] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirmPin, setSetupConfirmPin] = useState('');
  const [setupQuestion, setSetupQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [setupAnswer, setSetupAnswer] = useState('');
  const [isCustomQuestion, setIsCustomQuestion] = useState(false);

  // RECOVERY STATE
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newConfirmPin, setNewConfirmPin] = useState('');

  // Target pin length for display
  const targetPinLength = isConfigured ? configuredPinLength : (setupPin.length > 4 ? setupPin.length : 4);

  // Trigger error shake
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setIsShake(true);
    setTimeout(() => setIsShake(false), 500);
  };

  // Handle PIN Unlock Submission
  const handleAttemptUnlock = useCallback(async (pinToTest: string) => {
    if (isVerifying || isRateLimited) return;
    setIsVerifying(true);
    setErrorMessage(null);

    const res = await unlockVault(pinToTest);
    if (!res.success) {
      triggerError(res.error || 'Incorrect PIN');
      setEnteredPin('');
    } else {
      setEnteredPin('');
      setErrorMessage(null);
    }
    setIsVerifying(false);
  }, [unlockVault, isVerifying, isRateLimited]);

  // Handle Numeric Keypad Clicks
  const handleKeypadPress = (digit: string) => {
    if (isRateLimited) return;
    if (mode === 'UNLOCK') {
      if (enteredPin.length < 6) {
        const nextPin = enteredPin + digit;
        setEnteredPin(nextPin);
        setErrorMessage(null);

        // Auto-submit when length matches configured pin length
        if (nextPin.length === configuredPinLength) {
          handleAttemptUnlock(nextPin);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (mode === 'UNLOCK') {
      setEnteredPin(prev => prev.slice(0, -1));
      setErrorMessage(null);
    }
  };

  const handleClear = () => {
    if (mode === 'UNLOCK') {
      setEnteredPin('');
      setErrorMessage(null);
    }
  };

  // Keyboard Event Listener for UNLOCK mode
  useEffect(() => {
    if (!isLocked || mode !== 'UNLOCK') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Numbers 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (enteredPin.length >= 4) {
          handleAttemptUnlock(enteredPin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, mode, enteredPin, configuredPinLength, isRateLimited, handleAttemptUnlock]);

  // Handle First-Time Setup Submit
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!setupUserId.trim()) {
      setErrorMessage('Please choose a User ID or display name.');
      return;
    }
    if (!/^\d{4,6}$/.test(setupPin)) {
      setErrorMessage('PIN must be 4, 5, or 6 numeric digits.');
      return;
    }
    if (setupPin !== setupConfirmPin) {
      setErrorMessage('PINs do not match. Please re-enter.');
      return;
    }
    const finalQuestion = isCustomQuestion ? customQuestion.trim() : setupQuestion;
    if (!finalQuestion) {
      setErrorMessage('Please select or write a security question.');
      return;
    }
    if (!setupAnswer.trim()) {
      setErrorMessage('Please enter an answer to your security question.');
      return;
    }

    setIsVerifying(true);
    const res = await setupVault(setupUserId, setupPin, finalQuestion, setupAnswer);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to setup vault.');
    }
    setIsVerifying(false);
  };

  // Handle Recovery Question Verification
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recoveryAnswer.trim()) {
      setErrorMessage('Please provide your security answer.');
      return;
    }

    setIsVerifying(true);
    const res = await verifySecurityAnswer(recoveryAnswer);
    if (res.success) {
      setRecoveryVerified(true);
      setMode('SET_NEW_PIN');
    } else {
      triggerError(res.error || 'Incorrect answer. Please try again.');
    }
    setIsVerifying(false);
  };

  // Handle New PIN Setup after verification
  const handleSetNewPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!/^\d{4,6}$/.test(newPin)) {
      setErrorMessage('New PIN must be 4, 5, or 6 numeric digits.');
      return;
    }
    if (newPin !== newConfirmPin) {
      setErrorMessage('New PIN confirmation does not match.');
      return;
    }

    setIsVerifying(true);
    const res = await resetPin(newPin);
    if (res.success) {
      setMode('UNLOCK');
      setEnteredPin('');
      setRecoveryAnswer('');
      setRecoveryVerified(false);
      setNewPin('');
      setNewConfirmPin('');
    } else {
      setErrorMessage(res.error || 'Failed to update PIN.');
    }
    setIsVerifying(false);
  };

  // If already unlocked, do not render
  if (!isLocked && isConfigured) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 flex flex-col items-center relative overflow-hidden transition-transform ${
          isShake ? 'animate-bounce' : ''
        }`}
      >
        {/* Soft background ambient gradient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 1: UNLOCK SCREEN (Returning User)                             */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'UNLOCK' && (
          <div className="w-full flex flex-col items-center">
            {/* Vault Emblem */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-slate-800 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Rupee<span className="text-emerald-400">Flow</span> Vault
            </h2>
            <p className="text-xs text-slate-400 mt-1 text-center">
              Welcome back, <span className="font-semibold text-slate-200">{userId || 'User'}</span>. Enter your {configuredPinLength}-digit PIN to unlock.
            </p>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-3.5 w-full flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs text-center justify-center animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Rate Limit Banner */}
            {isRateLimited && (
              <div className="mt-3.5 w-full flex items-center gap-2 p-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs text-center justify-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>Security cooldown active. Retry in {rateLimitCountdown}s</span>
              </div>
            )}

            {/* PIN Dots Display */}
            <div className="flex items-center justify-center gap-3.5 my-6">
              {Array.from({ length: configuredPinLength }).map((_, idx) => {
                const isFilled = idx < enteredPin.length;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all duration-150 ${
                      isFilled
                        ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[280px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  disabled={isRateLimited || isVerifying}
                  className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 text-white text-lg font-semibold border border-slate-700/80 transition-all flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                  {digit}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                disabled={enteredPin.length === 0 || isRateLimited}
                className="h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/60 transition-all flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none"
              >
                Clear
              </button>

              {/* Zero */}
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                disabled={isRateLimited || isVerifying}
                className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 text-white text-lg font-semibold border border-slate-700/80 transition-all flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={enteredPin.length === 0 || isRateLimited}
                className="h-13 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/60 transition-all flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none"
                aria-label="Delete"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Helper Links */}
            <div className="flex items-center justify-between w-full mt-6 text-xs text-slate-400 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('RECOVERY');
                }}
                className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Forgot PIN?</span>
              </button>

              {onOpenResetModal && (
                <button
                  type="button"
                  onClick={onOpenResetModal}
                  className="hover:text-rose-400 text-slate-500 transition-colors cursor-pointer text-xs"
                >
                  Reset App
                </button>
              )}

              <span className="text-[11px] text-slate-500 font-mono">
                Auto-locks in 15m
              </span>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 2: FIRST-TIME SETUP WIZARD                                    */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'SETUP' && (
          <form onSubmit={handleSetupSubmit} className="w-full flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-slate-800 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white text-center tracking-tight">
              Set Up Vault Security
            </h2>
            <p className="text-xs text-slate-400 text-center mt-0.5 mb-4">
              Protect your bank balances, transactions, and Excel sheets with a custom ID and PIN.
            </p>

            {errorMessage && (
              <div className="mb-3.5 flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* User ID / Display Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Your Name or User ID
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={setupUserId}
                    onChange={e => setSetupUserId(e.target.value)}
                    placeholder="e.g. Daksh"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {/* 4 to 6 digit PIN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Security PIN (4–6 digits)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={setupPin}
                    onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 tracking-widest text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={setupConfirmPin}
                    onChange={e => setSetupConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 tracking-widest text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                  />
                </div>
              </div>

              {/* Security Question for Recovery */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Recovery Security Question
                </label>
                {!isCustomQuestion ? (
                  <select
                    value={setupQuestion}
                    onChange={e => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomQuestion(true);
                      } else {
                        setSetupQuestion(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {DEFAULT_SECURITY_QUESTIONS.map(q => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Write custom question...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={customQuestion}
                      onChange={e => setCustomQuestion(e.target.value)}
                      placeholder="Type your own question..."
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomQuestion(false)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl shrink-0"
                    >
                      Presets
                    </button>
                  </div>
                )}
              </div>

              {/* Security Answer */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Security Answer
                </label>
                <input
                  type="text"
                  required
                  value={setupAnswer}
                  onChange={e => setSetupAnswer(e.target.value)}
                  placeholder="Answer used if you ever forget your PIN"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-950/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Configuring Vault...' : 'Save & Enter RupeeFlow'}</span>
            </button>
          </form>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 3: RECOVERY (Answer Security Question)                        */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'RECOVERY' && (
          <form onSubmit={handleRecoverySubmit} className="w-full flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-800 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 mx-auto shadow-inner">
              <KeyRound className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white text-center tracking-tight">
              Vault Recovery
            </h2>
            <p className="text-xs text-slate-400 text-center mt-0.5 mb-4">
              Verify your security question to set a new PIN.
            </p>

            {errorMessage && (
              <div className="mb-3.5 flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="p-3 bg-slate-800/70 border border-slate-700/80 rounded-xl">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
                  Your Security Question:
                </span>
                <p className="text-xs font-medium text-slate-200">
                  {securityQuestion || 'What was your chosen security question?'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Your Answer
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={recoveryAnswer}
                  onChange={e => setRecoveryAnswer(e.target.value)}
                  placeholder="Enter the answer you provided during setup"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('UNLOCK');
                }}
                className="w-1/3 px-3 py-2 text-xs text-slate-400 hover:text-white border border-slate-700 rounded-xl transition-colors cursor-pointer text-center"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-2/3 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                <span>{isVerifying ? 'Verifying...' : 'Verify Answer'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* VIEW 4: SET NEW PIN AFTER RECOVERY VERIFICATION                    */}
        {/* ------------------------------------------------------------------ */}
        {mode === 'SET_NEW_PIN' && (
          <form onSubmit={handleSetNewPinSubmit} className="w-full flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-slate-800 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 mx-auto shadow-inner">
              <Unlock className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white text-center tracking-tight">
              Create New Security PIN
            </h2>
            <p className="text-xs text-slate-400 text-center mt-0.5 mb-4">
              Security answer verified! Please set your new 4–6 digit PIN.
            </p>

            {errorMessage && (
              <div className="mb-3.5 flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Security PIN (4–6 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 tracking-widest text-center focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={newConfirmPin}
                  onChange={e => setNewConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 tracking-widest text-center focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 text-slate-950 font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-sm shadow-emerald-950/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Saving New PIN...' : 'Save & Unlock Vault'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
