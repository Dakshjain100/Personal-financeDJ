import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  generateSalt,
  hashCredential,
  verifyCredential,
  normalizeSecurityAnswer,
  DEFAULT_SECURITY_QUESTIONS
} from '../utils/securityCrypto';

interface SecurityConfig {
  configured: boolean;
  userId: string;
  pinSalt: string;
  pinHash: string;
  pinLength: number;
  securityQuestion: string;
  answerSalt: string;
  answerHash: string;
  createdAt: string;
  lastUpdated?: string;
}

interface SecurityContextType {
  isConfigured: boolean;
  isLocked: boolean;
  userId: string;
  securityQuestion: string;
  pinLength: number;
  failedAttempts: number;
  isRateLimited: boolean;
  rateLimitCountdown: number;
  
  // Actions
  setupVault: (
    userId: string,
    pin: string,
    question: string,
    answer: string
  ) => Promise<{ success: boolean; error?: string }>;
  
  unlockVault: (pin: string) => Promise<{ success: boolean; error?: string }>;
  
  lockVault: () => void;
  
  verifySecurityAnswer: (answer: string) => Promise<{ success: boolean; error?: string }>;
  
  resetPin: (newPin: string) => Promise<{ success: boolean; error?: string }>;
  
  updateSecurityProfile: (
    newUserId: string,
    currentPin: string,
    newPin?: string,
    newQuestion?: string,
    newAnswer?: string
  ) => Promise<{ success: boolean; error?: string }>;

  verifyPin: (pin: string) => Promise<boolean>;

  resetVaultCompletely: () => void;
}

const STORAGE_SECURITY_KEY = 'rupeeflow_security_config_v1';
const SESSION_UNLOCKED_KEY = 'rupeeflow_session_unlocked_v1';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load configuration from localStorage
  const [config, setConfig] = useState<SecurityConfig | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SECURITY_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Track unlocked state via sessionStorage so closing the tab automatically locks
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SECURITY_KEY);
      if (!saved) return false; // If not configured yet, modal opens in setup mode
      const isSessionUnlocked = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
      return !isSessionUnlocked;
    } catch {
      return true;
    }
  });

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  const inactivityTimerRef = useRef<number | null>(null);

  // Lock function
  const lockVault = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    } catch {
      // Ignore
    }
    setIsLocked(true);
    setFailedAttempts(0);
  }, []);

  // Unlock function
  const unlockVault = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    if (isRateLimited) {
      return { success: false, error: `Too many attempts. Please wait ${rateLimitCountdown} seconds.` };
    }

    if (!config || !config.configured) {
      return { success: false, error: 'Vault has not been set up yet.' };
    }

    const isValid = await verifyCredential(pin, config.pinSalt, config.pinHash);

    if (isValid) {
      setFailedAttempts(0);
      try {
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      } catch {
        // Ignore
      }
      setIsLocked(false);
      return { success: true };
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 5) {
        setIsRateLimited(true);
        setRateLimitCountdown(30);
      }

      return {
        success: false,
        error: newAttempts >= 5
          ? 'Too many incorrect attempts. Locked for 30 seconds.'
          : `Incorrect PIN. ${5 - newAttempts} attempt(s) remaining.`
      };
    }
  }, [config, failedAttempts, isRateLimited, rateLimitCountdown]);

  // Rate limit countdown effect
  useEffect(() => {
    if (!isRateLimited) return;

    const interval = window.setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev <= 1) {
          setIsRateLimited(false);
          setFailedAttempts(0);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRateLimited]);

  // Initial setup of the vault
  const setupVault = useCallback(async (
    userId: string,
    pin: string,
    question: string,
    answer: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId.trim()) {
      return { success: false, error: 'Please enter a User ID / Name.' };
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return { success: false, error: 'PIN must be between 4 and 6 digits.' };
    }
    if (!question.trim()) {
      return { success: false, error: 'Please choose or enter a security question.' };
    }
    if (!answer.trim()) {
      return { success: false, error: 'Please enter an answer to the security question.' };
    }

    const pinSalt = generateSalt();
    const pinHash = await hashCredential(pin, pinSalt);

    const answerSalt = generateSalt();
    const normalizedAnswer = normalizeSecurityAnswer(answer);
    const answerHash = await hashCredential(normalizedAnswer, answerSalt);

    const newConfig: SecurityConfig = {
      configured: true,
      userId: userId.trim(),
      pinSalt,
      pinHash,
      pinLength: pin.length,
      securityQuestion: question.trim(),
      answerSalt,
      answerHash,
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_SECURITY_KEY, JSON.stringify(newConfig));
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
    } catch (e) {
      console.error('Failed to store security configuration:', e);
      return { success: false, error: 'Failed to write security credentials to browser storage.' };
    }

    setConfig(newConfig);
    setIsLocked(false);
    setFailedAttempts(0);
    return { success: true };
  }, []);

  // Verify security question answer during recovery
  const verifySecurityAnswer = useCallback(async (
    answer: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!config) return { success: false, error: 'No security profile found.' };
    
    const normalized = normalizeSecurityAnswer(answer);
    const isValid = await verifyCredential(normalized, config.answerSalt, config.answerHash);

    if (isValid) {
      return { success: true };
    } else {
      return { success: false, error: 'Incorrect answer. Please verify and try again.' };
    }
  }, [config]);

  // Reset PIN after security answer is verified
  const resetPin = useCallback(async (
    newPin: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!config) return { success: false, error: 'No security profile found.' };
    if (!/^\d{4,6}$/.test(newPin)) {
      return { success: false, error: 'New PIN must be 4 to 6 digits.' };
    }

    const pinSalt = generateSalt();
    const pinHash = await hashCredential(newPin, pinSalt);

    const updatedConfig: SecurityConfig = {
      ...config,
      pinSalt,
      pinHash,
      pinLength: newPin.length,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_SECURITY_KEY, JSON.stringify(updatedConfig));
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
    } catch {
      return { success: false, error: 'Failed to update PIN.' };
    }

    setConfig(updatedConfig);
    setIsLocked(false);
    setFailedAttempts(0);
    return { success: true };
  }, [config]);

  // Update profile while unlocked
  const updateSecurityProfile = useCallback(async (
    newUserId: string,
    currentPin: string,
    newPin?: string,
    newQuestion?: string,
    newAnswer?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!config) return { success: false, error: 'No security profile found.' };

    const isCurrentPinValid = await verifyCredential(currentPin, config.pinSalt, config.pinHash);
    if (!isCurrentPinValid) {
      return { success: false, error: 'Current PIN is incorrect.' };
    }

    let updated = { ...config };

    if (newUserId.trim()) {
      updated.userId = newUserId.trim();
    }

    if (newPin && newPin.trim()) {
      if (!/^\d{4,6}$/.test(newPin)) {
        return { success: false, error: 'New PIN must be 4 to 6 digits.' };
      }
      const pinSalt = generateSalt();
      const pinHash = await hashCredential(newPin, pinSalt);
      updated.pinSalt = pinSalt;
      updated.pinHash = pinHash;
      updated.pinLength = newPin.length;
    }

    if (newQuestion && newAnswer && newAnswer.trim()) {
      const answerSalt = generateSalt();
      const normalizedAnswer = normalizeSecurityAnswer(newAnswer);
      const answerHash = await hashCredential(normalizedAnswer, answerSalt);
      updated.securityQuestion = newQuestion.trim();
      updated.answerSalt = answerSalt;
      updated.answerHash = answerHash;
    }

    updated.lastUpdated = new Date().toISOString();

    try {
      localStorage.setItem(STORAGE_SECURITY_KEY, JSON.stringify(updated));
      setConfig(updated);
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save updated settings.' };
    }
  }, [config]);

  // Verify PIN without mutating session or attempts
  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!config || !config.configured) return true;
    return await verifyCredential(pin, config.pinSalt, config.pinHash);
  }, [config]);

  // Reset entire vault credentials (allows starting fresh if needed)
  const resetVaultCompletely = useCallback(() => {
    localStorage.removeItem(STORAGE_SECURITY_KEY);
    sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
    setConfig(null);
    setIsLocked(false);
    setFailedAttempts(0);
  }, []);

  // 15-Minute Inactivity Auto-Lock Listener
  useEffect(() => {
    // If locked or not configured, no need for inactivity timer
    if (isLocked || !config?.configured) {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = window.setTimeout(() => {
        lockVault();
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Initial timer arm
    resetInactivityTimer();

    // Interaction events to detect user activity
    const activityEvents = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    
    // Throttled handler to avoid CPU churn
    let lastActivity = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 1000) { // Throttle to 1 second
        lastActivity = now;
        resetInactivityTimer();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [isLocked, config?.configured, lockVault]);

  const value = {
    isConfigured: !!config?.configured,
    isLocked: !config?.configured ? true : isLocked,
    userId: config?.userId || '',
    securityQuestion: config?.securityQuestion || '',
    pinLength: config?.pinLength || 4,
    failedAttempts,
    isRateLimited,
    rateLimitCountdown,
    setupVault,
    unlockVault,
    lockVault,
    verifySecurityAnswer,
    resetPin,
    updateSecurityProfile,
    verifyPin,
    resetVaultCompletely
  };

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
