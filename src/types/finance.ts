export type AccountType = string;

export const COMMON_ACCOUNT_TYPES = [
  'Saving',
  'Current',
  'Cash',
  'Savings Bucket',
  'Emergency Fund',
  'Fixed Deposit',
  'Demat / Stocks',
  'Credit Card'
] as const;

export type CategoryClassification = 'EXPENSE' | 'INCOME' | 'SYSTEM';

export type TransactionType = 
  | 'Income' 
  | 'Expense' 
  | 'Savings' 
  | 'Transfer' 
  | 'Previous Balance';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  is_active: boolean;
  institution_code?: string; // 'BOI' | 'HDFC' | 'SBI' | 'AXIS' | 'CASH' | 'SAVINGS'
  account_number_last4?: string;
}

export interface Category {
  id: string;
  name: string;
  classification: CategoryClassification;
  icon?: string;
  color?: string;
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  month_period: string; // E.g. "2026-10"
  day: number; // 1-31
  category_id: string;
  type: TransactionType;
  amount: number;
  from_account: string; // Account ID
  to_account?: string | null; // Account ID (required if type === 'Transfer')
  notes?: string;
}

export type BalanceMode = 'TILL_DATE' | 'DAY_NET';

export type BalanceScope = 'ALL' | 'BOI_CASH_AXIS_SBI';

export interface FilterState {
  year: number; // e.g. 2026
  month: number | 'ALL'; // 1-12 or 'ALL'
  day: number | 'ALL'; // 1-31 or 'ALL'
  balanceMode: BalanceMode;
  balanceScope: BalanceScope;
  searchQuery: string;
  selectedAccountId: string | 'ALL';
  selectedCategoryId: string | 'ALL';
  selectedType: TransactionType | 'ALL';
}

export interface MonthlySummary {
  month: number;
  monthName: string;
  year: number;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number; // percentage (0-100)
  netCashFlow: number; // income - expense - savings
  runningBalance: number; // cumulative balance up to this month
}

export interface CategoryExpenseRollup {
  categoryId: string;
  categoryName: string;
  totalExpense: number;
  percentageOfTotal: number;
  dailyAverage: number;
  monthlyAverage: number;
  transactionCount: number;
}

export interface PortfolioDistribution {
  bankBalances: number;
  cashInHand: number;
  savingsPool: number;
  expensePool: number;
  totalPortfolio: number;
  percentages: {
    bank: number;
    cash: number;
    savings: number;
    expense: number;
  };
}
