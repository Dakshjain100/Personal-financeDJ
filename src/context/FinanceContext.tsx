import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Account,
  Category,
  Transaction,
  FilterState,
  MonthlySummary,
  CategoryExpenseRollup,
  PortfolioDistribution,
  BalanceMode,
  TransactionType
} from '../types/finance';
import { INITIAL_ACCOUNTS, INITIAL_CATEGORIES, INITIAL_TRANSACTIONS } from '../data/initialData';
import { getDaysInMonth, MONTH_NAMES } from '../utils/formatters';
import { writeBackToLinkedFile, hasLinkedFile, getLinkedFileName, unlinkLocalFile } from '../utils/excelSync';

interface FinanceContextType {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  filters: FilterState;
  isPrivacyActive: boolean;
  activeTab: 'dashboard' | 'ledger' | 'accounts';
  
  // Setters & Actions
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  setFilterProp: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setIsPrivacyActive: (value: boolean | ((prev: boolean) => boolean)) => void;
  setActiveTab: (tab: 'dashboard' | 'ledger' | 'accounts') => void;
  
  // Transaction CRUD
  addTransaction: (tx: Omit<Transaction, 'id' | 'timestamp' | 'day' | 'month_period'> & { date: string }) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  
  // Account Management
  updateAccount: (id: string, updates: Partial<Account>) => void;
  addAccount: (account: Omit<Account, 'id'>) => void;
  
  // Reset & Backup & Sync
  resetToDefaultData: () => void;
  wipeAllLedgerData: () => void;
  importTransactions: (
    newTxs: Transaction[],
    replace: boolean,
    newAccounts?: Account[],
    newCategories?: Category[]
  ) => void;
  syncWithLinkedExcel: () => Promise<{ success: boolean; error?: string }>;
  isExcelLinked: boolean;
  linkedExcelName: string | null;
  setIsExcelLinked: (linked: boolean, name?: string | null) => void;
  isGSheetLinked: boolean;
  linkedGSheetTitle: string | null;
  setIsGSheetLinked: (linked: boolean, title?: string | null) => void;
  
  // Computed Calculations
  accountBalances: Record<string, { current: number; tillDate: number; dayNet: number }>;
  totalLiquidBalance: number;
  coreFourBalance: { current: number; tillDate: number; dayNet: number };
  isCoreFourAccount: (account: Account) => boolean;
  filteredTransactions: Transaction[];
  kpis: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    netCashFlow: number;
    transactionCount: number;
  };
  monthlySummaries: MonthlySummary[];
  categoryExpenseRollups: CategoryExpenseRollup[];
  portfolioDistribution: PortfolioDistribution;
  selectedDateCutoff: string;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCOUNTS: 'rupeeflow_accounts_v1',
  CATEGORIES: 'rupeeflow_categories_v1',
  TRANSACTIONS: 'rupeeflow_transactions_v1',
  PRIVACY: 'rupeeflow_privacy_mode',
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Accounts
  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  });

  // Categories
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  // Privacy Mode Toggle
  const [isPrivacyActive, setIsPrivacyActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PRIVACY) === 'true';
    } catch {
      return false;
    }
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'accounts'>('dashboard');

  // Filters state (Defaults aligned with Current Reference Time: 25 Oct 2026)
  const [filters, setFilters] = useState<FilterState>({
    year: 2026,
    month: 10, // October
    day: 25, // 25th
    balanceMode: 'TILL_DATE',
    balanceScope: 'ALL',
    searchQuery: '',
    selectedAccountId: 'ALL',
    selectedCategoryId: 'ALL',
    selectedType: 'ALL',
  });

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Unable to persist accounts to localStorage', e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.warn('Unable to persist categories to localStorage', e);
    }
  }, [categories]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.warn('Unable to persist transactions to localStorage', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRIVACY, String(isPrivacyActive));
    } catch (e) {
      console.warn('Unable to persist privacy state', e);
    }
  }, [isPrivacyActive]);

  const setFilterProp = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset to default seed data
  const resetToDefaultData = useCallback(() => {
    setAccounts(INITIAL_ACCOUNTS);
    setCategories(INITIAL_CATEGORIES);
    setTransactions(INITIAL_TRANSACTIONS);
    setFilters({
      year: 2026,
      month: 10,
      day: 25,
      balanceMode: 'TILL_DATE',
      balanceScope: 'ALL',
      searchQuery: '',
      selectedAccountId: 'ALL',
      selectedCategoryId: 'ALL',
      selectedType: 'ALL',
    });
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  }, []);


  // Transaction CRUD
  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'timestamp' | 'day' | 'month_period'> & { date: string }) => {
    const [y, m, d] = tx.date.split('-').map(Number);
    const day = d || 1;
    const monthStr = String(m || 1).padStart(2, '0');
    const month_period = `${y || 2026}-${monthStr}`;
    
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      day,
      month_period,
    };

    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(tx => {
        if (tx.id !== id) return tx;
        let day = tx.day;
        let month_period = tx.month_period;
        if (updates.date && updates.date !== tx.date) {
          const [y, m, d] = updates.date.split('-').map(Number);
          day = d || 1;
          const monthStr = String(m || 1).padStart(2, '0');
          month_period = `${y || 2026}-${monthStr}`;
        }
        return {
          ...tx,
          ...updates,
          day,
          month_period,
        };
      })
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);

  // Account Management
  const updateAccount = useCallback((id: string, updates: Partial<Account>) => {
    setAccounts(prev => prev.map(acc => (acc.id === id ? { ...acc, ...updates } : acc)));
  }, []);

  const addAccount = useCallback((acc: Omit<Account, 'id'>) => {
    const newAcc: Account = {
      ...acc,
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setAccounts(prev => [...prev, newAcc]);
  }, []);

  // Excel Linking & Live Two-Way Sync
  const [isExcelLinked, setIsExcelLinkedState] = useState<boolean>(() => hasLinkedFile());
  const [linkedExcelName, setLinkedExcelName] = useState<string | null>(() => getLinkedFileName());

  const setIsExcelLinked = useCallback((linked: boolean, name?: string | null) => {
    setIsExcelLinkedState(linked);
    setLinkedExcelName(name || null);
  }, []);

  // Google Sheets Linking State
  const [isGSheetLinked, setIsGSheetLinkedState] = useState<boolean>(() => {
    return !!localStorage.getItem('rupeeflow_linked_gsheet_id');
  });
  const [linkedGSheetTitle, setLinkedGSheetTitle] = useState<string | null>(() => {
    return localStorage.getItem('rupeeflow_linked_gsheet_title') || null;
  });

  const setIsGSheetLinked = useCallback((linked: boolean, title?: string | null) => {
    setIsGSheetLinkedState(linked);
    setLinkedGSheetTitle(title || null);
    if (!linked) {
      localStorage.removeItem('rupeeflow_linked_gsheet_id');
      localStorage.removeItem('rupeeflow_linked_gsheet_title');
    } else if (title) {
      localStorage.setItem('rupeeflow_linked_gsheet_title', title);
    }
  }, []);

  const syncWithLinkedExcel = useCallback(async () => {
    if (!hasLinkedFile()) {
      return { success: false, error: 'No Excel file is linked yet.' };
    }
    return await writeBackToLinkedFile(transactions, accounts, categories);
  }, [transactions, accounts, categories]);

  // Wipe all user data completely out of the app
  const wipeAllLedgerData = useCallback(() => {
    // 1. Wipe all transactions completely
    setTransactions([]);
    // 2. Zero all account opening balances
    setAccounts(prev => prev.map(a => ({ ...a, initial_balance: 0 })));
    // 3. Unlink Excel & Google Sheets
    setIsExcelLinked(false, null);
    setIsGSheetLinked(false, null);
    unlinkLocalFile();
    // 4. Overwrite local storage so transactions are wiped
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_ACCOUNTS.map(a => ({ ...a, initial_balance: 0 }))));
      localStorage.removeItem('rupeeflow_linked_gsheet_id');
      localStorage.removeItem('rupeeflow_linked_gsheet_title');
      localStorage.removeItem('rupeeflow_linked_file');
    } catch (e) {
      console.warn('Storage wipe error', e);
    }
    // 5. Reset filter dates
    setFilters({
      year: 2026,
      month: 10,
      day: 25,
      balanceMode: 'TILL_DATE',
      balanceScope: 'ALL',
      searchQuery: '',
      selectedAccountId: 'ALL',
      selectedCategoryId: 'ALL',
      selectedType: 'ALL',
    });
  }, [setIsExcelLinked, setIsGSheetLinked]);

  // Debounced auto-save back to linked Excel file on transaction or account mutations
  useEffect(() => {
    if (isExcelLinked && hasLinkedFile()) {
      const timer = setTimeout(() => {
        writeBackToLinkedFile(transactions, accounts, categories);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [transactions, accounts, categories, isExcelLinked]);

  // Bulk Import Transactions from Excel / CSV
  const importTransactions = useCallback((
    newTxs: Transaction[],
    replace: boolean,
    newAccounts?: Account[],
    newCategories?: Category[]
  ) => {
    if (newAccounts && newAccounts.length > 0) {
      setAccounts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const existingNames = new Set(prev.map(a => a.name.toLowerCase().trim()));
        const toAdd = newAccounts.filter(a => !existingIds.has(a.id) && !existingNames.has(a.name.toLowerCase().trim()));
        return [...prev, ...toAdd];
      });
    }
    if (newCategories && newCategories.length > 0) {
      setCategories(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const existingNames = new Set(prev.map(c => c.name.toLowerCase().trim()));
        const toAdd = newCategories.filter(c => !existingIds.has(c.id) && !existingNames.has(c.name.toLowerCase().trim()));
        return [...prev, ...toAdd];
      });
    }
    setTransactions(prev => (replace ? newTxs : [...newTxs, ...prev]));
  }, []);

  // Compute selected Date Cutoff string for 'Till Date' and 'Day Net'
  const selectedDateCutoff = useMemo(() => {
    const y = filters.year;
    if (filters.month === 'ALL') {
      return `${y}-12-31`;
    }
    const m = String(filters.month).padStart(2, '0');
    if (filters.day === 'ALL') {
      const daysInMonth = getDaysInMonth(y, filters.month);
      return `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`;
    }
    const d = String(filters.day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [filters.year, filters.month, filters.day]);

  // Exact target day date string (e.g. 2026-10-25) if day is selected
  const exactDayTargetString = useMemo(() => {
    if (filters.month === 'ALL' || filters.day === 'ALL') return null;
    const m = String(filters.month).padStart(2, '0');
    const d = String(filters.day).padStart(2, '0');
    return `${filters.year}-${m}-${d}`;
  }, [filters.year, filters.month, filters.day]);

  // ---------------------------------------------------------------------------
  // 4.1 Account Balance Engine (The Liquidity Matrix)
  // ---------------------------------------------------------------------------
  const accountBalances = useMemo(() => {
    const result: Record<string, { current: number; tillDate: number; dayNet: number }> = {};

    accounts.forEach(acc => {
      let currentInflows = 0;
      let currentOutflows = 0;
      let tillDateInflows = 0;
      let tillDateOutflows = 0;
      let dayNetInflows = 0;
      let dayNetOutflows = 0;

      transactions.forEach(tx => {
        const isTxFrom = tx.from_account === acc.id;
        const isTxTo = tx.to_account === acc.id;
        if (!isTxFrom && !isTxTo) return;

        const isIncomeOrPrev = isTxFrom && (tx.type === 'Income' || tx.type === 'Previous Balance');
        const isTransferIn = isTxTo && tx.type === 'Transfer';
        const isExpenseOrSavings = isTxFrom && (tx.type === 'Expense' || tx.type === 'Savings');
        const isTransferOut = isTxFrom && tx.type === 'Transfer';

        const isBeforeOrOnCutoff = tx.date <= selectedDateCutoff;
        
        // Check if transaction matches day-net target window:
        // If a specific day is selected, tx.date must strictly match exactDayTargetString.
        // If month is selected and day is 'ALL', tx matches that month.
        // If year is selected and month is 'ALL', tx matches that year.
        let isDayNetMatch = false;
        if (exactDayTargetString) {
          isDayNetMatch = tx.date === exactDayTargetString;
        } else if (filters.month !== 'ALL') {
          const monthPeriod = `${filters.year}-${String(filters.month).padStart(2, '0')}`;
          isDayNetMatch = tx.month_period === monthPeriod;
        } else {
          isDayNetMatch = tx.date.startsWith(`${filters.year}-`);
        }

        // Current (All-Time)
        if (isIncomeOrPrev || isTransferIn) currentInflows += tx.amount;
        if (isExpenseOrSavings || isTransferOut) currentOutflows += tx.amount;

        // Till Date
        if (isBeforeOrOnCutoff) {
          if (isIncomeOrPrev || isTransferIn) tillDateInflows += tx.amount;
          if (isExpenseOrSavings || isTransferOut) tillDateOutflows += tx.amount;
        }

        // Day Net
        if (isDayNetMatch) {
          if (isIncomeOrPrev || isTransferIn) dayNetInflows += tx.amount;
          if (isExpenseOrSavings || isTransferOut) dayNetOutflows += tx.amount;
        }
      });

      const currentBalance = acc.initial_balance + currentInflows - currentOutflows;
      const tillDateBalance = acc.initial_balance + tillDateInflows - tillDateOutflows;
      const dayNet = dayNetInflows - dayNetOutflows;

      result[acc.id] = {
        current: currentBalance,
        tillDate: tillDateBalance,
        dayNet: dayNet,
      };
    });

    return result;
  }, [accounts, transactions, selectedDateCutoff, exactDayTargetString, filters.month, filters.year]);

  // Helper to check if an account is part of the core 4 (BOI, Cash, Axis, SBI)
  const isCoreFourAccount = useCallback((account: Account): boolean => {
    const nameNorm = (account.name || '').trim().toLowerCase();
    const codeNorm = (account.institution_code || '').trim().toLowerCase();
    const targets = ['boi', 'cash', 'axis', 'sbi'];
    return targets.includes(nameNorm) || targets.includes(codeNorm);
  }, []);

  // Total Liquid Balance (Banks + Cash excluding dedicated savings buckets)
  const totalLiquidBalance = useMemo(() => {
    return accounts
      .filter(acc => {
        if (!acc.is_active) return false;
        const typeLower = (acc.type || '').toLowerCase();
        const nameLower = (acc.name || '').toLowerCase();
        return !typeLower.includes('bucket') && nameLower !== 'savings';
      })
      .reduce((sum, acc) => {
        const bal = filters.balanceMode === 'DAY_NET'
          ? (accountBalances[acc.id]?.dayNet || 0)
          : (accountBalances[acc.id]?.tillDate || 0);
        return sum + bal;
      }, 0);
  }, [accounts, accountBalances, filters.balanceMode]);

  // Dedicated Core 4 Balance: BOI + CASH + AXIS + SBI only
  const coreFourBalance = useMemo(() => {
    let current = 0;
    let tillDate = 0;
    let dayNet = 0;

    accounts.forEach(acc => {
      if (isCoreFourAccount(acc)) {
        const bal = accountBalances[acc.id] || { current: 0, tillDate: 0, dayNet: 0 };
        current += bal.current;
        tillDate += bal.tillDate;
        dayNet += bal.dayNet;
      }
    });

    return { current, tillDate, dayNet };
  }, [accounts, accountBalances, isCoreFourAccount]);

  // ---------------------------------------------------------------------------
  // Filtered Transactions for Active Window
  // ---------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Year filter
      if (!tx.date.startsWith(`${filters.year}-`)) return false;

      // Month filter
      if (filters.month !== 'ALL') {
        const m = String(filters.month).padStart(2, '0');
        if (tx.month_period !== `${filters.year}-${m}`) return false;
      }

      // Day filter
      if (filters.day !== 'ALL') {
        if (tx.day !== filters.day) return false;
      }

      // Account filter
      if (filters.selectedAccountId !== 'ALL') {
        if (tx.from_account !== filters.selectedAccountId && tx.to_account !== filters.selectedAccountId) {
          return false;
        }
      }

      // Category filter
      if (filters.selectedCategoryId !== 'ALL') {
        if (tx.category_id !== filters.selectedCategoryId) return false;
      }

      // Type filter
      if (filters.selectedType !== 'ALL') {
        if (tx.type !== filters.selectedType) return false;
      }

      // Search query (notes, amount, category name)
      if (filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        const category = categories.find(c => c.id === tx.category_id);
        const catName = category?.name?.toLowerCase() || '';
        const notes = (tx.notes || '').toLowerCase();
        const amountStr = tx.amount.toString();
        if (!catName.includes(query) && !notes.includes(query) && !amountStr.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filters, categories]);

  // ---------------------------------------------------------------------------
  // 4.3 Key Performance Indicators (KPIs) for the active filter window
  // ---------------------------------------------------------------------------
  const kpis = useMemo(() => {
    // Window transactions for income/expense
    const windowTxs = transactions.filter(tx => {
      if (!tx.date.startsWith(`${filters.year}-`)) return false;
      if (filters.month !== 'ALL') {
        const m = String(filters.month).padStart(2, '0');
        if (tx.month_period !== `${filters.year}-${m}`) return false;
      }
      if (filters.day !== 'ALL') {
        if (tx.day !== filters.day) return false;
      }
      return true;
    });

    const totalIncome = windowTxs
      .filter(tx => tx.type === 'Income')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalExpense = windowTxs
      .filter(tx => tx.type === 'Expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Section 4.2 Net Savings in the selected window:
    // Net Savings = Sum(Type = 'Savings') + Sum(Transfers to Savings) - Sum(Transfers from Savings) - Sum(Expenses from Savings)
    const savingsAccounts = accounts.filter(acc => acc.type === 'SAVINGS_BUCKET' || acc.name.toLowerCase() === 'savings');
    const savingsAccountIds = new Set(savingsAccounts.map(a => a.id));

    let netSavings = 0;
    windowTxs.forEach(tx => {
      if (tx.type === 'Savings') {
        netSavings += tx.amount;
      }
      if (tx.type === 'Transfer') {
        if (tx.to_account && savingsAccountIds.has(tx.to_account)) {
          netSavings += tx.amount;
        }
        if (savingsAccountIds.has(tx.from_account)) {
          netSavings -= tx.amount;
        }
      }
      if (tx.type === 'Expense' && savingsAccountIds.has(tx.from_account)) {
        netSavings -= tx.amount;
      }
    });

    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const netCashFlow = totalIncome - totalExpense - netSavings;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      netCashFlow,
      transactionCount: windowTxs.length,
    };
  }, [transactions, accounts, filters.year, filters.month, filters.day]);

  // ---------------------------------------------------------------------------
  // 12-Month Rolling Cash Flow Table Data
  // ---------------------------------------------------------------------------
  const monthlySummaries = useMemo<MonthlySummary[]>(() => {
    const summaries: MonthlySummary[] = [];
    const savingsAccounts = accounts.filter(acc => acc.type === 'SAVINGS_BUCKET' || acc.name.toLowerCase() === 'savings');
    const savingsAccountIds = new Set(savingsAccounts.map(a => a.id));

    let runningBalance = accounts.reduce((sum, a) => sum + a.initial_balance, 0);

    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const period = `${filters.year}-${monthStr}`;

      const monthTxs = transactions.filter(tx => tx.month_period === period);

      const income = monthTxs
        .filter(tx => tx.type === 'Income')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const expense = monthTxs
        .filter(tx => tx.type === 'Expense')
        .reduce((sum, tx) => sum + tx.amount, 0);

      let savings = 0;
      monthTxs.forEach(tx => {
        if (tx.type === 'Savings') savings += tx.amount;
        if (tx.type === 'Transfer') {
          if (tx.to_account && savingsAccountIds.has(tx.to_account)) savings += tx.amount;
          if (savingsAccountIds.has(tx.from_account)) savings -= tx.amount;
        }
        if (tx.type === 'Expense' && savingsAccountIds.has(tx.from_account)) {
          savings -= tx.amount;
        }
      });

      const savingsRate = income > 0 ? (savings / income) * 100 : 0;
      const netCashFlow = income - expense - savings;

      // Running Cumulative Balance update
      // Net change to overall system = Income - Expense
      runningBalance += (income - expense);

      summaries.push({
        month: m,
        monthName: MONTH_NAMES[m - 1],
        year: filters.year,
        income,
        expense,
        savings,
        savingsRate,
        netCashFlow,
        runningBalance,
      });
    }

    return summaries;
  }, [accounts, transactions, filters.year]);

  // ---------------------------------------------------------------------------
  // 4.4 Granular Expense Analytics (Category Rollups)
  // ---------------------------------------------------------------------------
  const categoryExpenseRollups = useMemo<CategoryExpenseRollup[]>(() => {
    // Window transactions for expenses
    const periodExpenseTxs = transactions.filter(tx => {
      if (tx.type !== 'Expense') return false;
      if (!tx.date.startsWith(`${filters.year}-`)) return false;
      if (filters.month !== 'ALL') {
        const m = String(filters.month).padStart(2, '0');
        if (tx.month_period !== `${filters.year}-${m}`) return false;
      }
      if (filters.day !== 'ALL') {
        if (tx.day !== filters.day) return false;
      }
      return true;
    });

    const totalExpense = periodExpenseTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const expenseCategories = categories.filter(c => c.classification === 'EXPENSE');

    const rollups: CategoryExpenseRollup[] = expenseCategories.map(cat => {
      const catTxs = periodExpenseTxs.filter(tx => tx.category_id === cat.id);
      const catExpense = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const percentageOfTotal = totalExpense > 0 ? (catExpense / totalExpense) * 100 : 0;

      // Section 4.4 Burn Rate Averages:
      // Daily Average (When filtered to a specific month): Category Expense / Days in Selected Month
      // Monthly Average (When filtered to "All" / YTD): Category Expense / 12
      let dailyAverage = 0;
      let monthlyAverage = 0;

      if (filters.month !== 'ALL') {
        const daysCount = getDaysInMonth(filters.year, filters.month);
        dailyAverage = catExpense / daysCount;
        monthlyAverage = catExpense;
      } else {
        dailyAverage = catExpense / 365;
        monthlyAverage = catExpense / 12;
      }

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        totalExpense: catExpense,
        percentageOfTotal,
        dailyAverage,
        monthlyAverage,
        transactionCount: catTxs.length,
      };
    });

    // Sort descending by highest spending
    return rollups.sort((a, b) => b.totalExpense - a.totalExpense);
  }, [transactions, categories, filters.year, filters.month, filters.day]);

  // ---------------------------------------------------------------------------
  // 4.5 Financial Allocation Breakdown (Portfolio Distribution)
  // ---------------------------------------------------------------------------
  const portfolioDistribution = useMemo<PortfolioDistribution>(() => {
    // Bank Balances: BOI, HDFC, Axis, SBI (SAVINGS_ACCOUNT, CHECKING_ACCOUNT)
    let bankBalances = 0;
    let cashInHand = 0;
    let savingsPool = 0;

    accounts.forEach(acc => {
      const bal = accountBalances[acc.id]?.tillDate || 0;
      if (acc.type === 'CASH') {
        cashInHand += Math.max(0, bal);
      } else if (acc.type === 'SAVINGS_BUCKET') {
        savingsPool += Math.max(0, bal);
      } else {
        bankBalances += Math.max(0, bal);
      }
    });

    const expensePool = kpis.totalExpense;
    const totalPortfolio = bankBalances + cashInHand + savingsPool + expensePool;

    const percentages = {
      bank: totalPortfolio > 0 ? (bankBalances / totalPortfolio) * 100 : 0,
      cash: totalPortfolio > 0 ? (cashInHand / totalPortfolio) * 100 : 0,
      savings: totalPortfolio > 0 ? (savingsPool / totalPortfolio) * 100 : 0,
      expense: totalPortfolio > 0 ? (expensePool / totalPortfolio) * 100 : 0,
    };

    return {
      bankBalances,
      cashInHand,
      savingsPool,
      expensePool,
      totalPortfolio,
      percentages,
    };
  }, [accounts, accountBalances, kpis.totalExpense]);

  const value = {
    accounts,
    categories,
    transactions,
    filters,
    isPrivacyActive,
    activeTab,
    setFilters,
    setFilterProp,
    setIsPrivacyActive,
    setActiveTab,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateAccount,
    addAccount,
    resetToDefaultData,
    wipeAllLedgerData,
    importTransactions,
    syncWithLinkedExcel,
    isExcelLinked,
    linkedExcelName,
    setIsExcelLinked,
    isGSheetLinked,
    linkedGSheetTitle,
    setIsGSheetLinked,
    accountBalances,
    totalLiquidBalance,
    coreFourBalance,
    isCoreFourAccount,
    filteredTransactions,
    kpis,
    monthlySummaries,
    categoryExpenseRollups,
    portfolioDistribution,
    selectedDateCutoff,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
