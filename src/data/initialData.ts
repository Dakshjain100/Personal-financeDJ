import { Account, Category, Transaction } from '../types/finance';

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-boi',
    name: 'BOI',
    type: 'Saving',
    initial_balance: 45000,
    is_active: true,
    institution_code: 'BOI',
    account_number_last4: '4821',
  },
  {
    id: 'acc-hdfc',
    name: 'HDFC',
    type: 'Saving',
    initial_balance: 135000,
    is_active: true,
    institution_code: 'HDFC',
    account_number_last4: '9012',
  },
  {
    id: 'acc-sbi',
    name: 'SBI',
    type: 'Saving',
    initial_balance: 62000,
    is_active: true,
    institution_code: 'SBI',
    account_number_last4: '3156',
  },
  {
    id: 'acc-axis',
    name: 'Axis',
    type: 'Current',
    initial_balance: 28500,
    is_active: true,
    institution_code: 'AXIS',
    account_number_last4: '7740',
  },
  {
    id: 'acc-cash',
    name: 'Cash',
    type: 'Cash',
    initial_balance: 9500,
    is_active: true,
    institution_code: 'CASH',
  },
  {
    id: 'acc-savings',
    name: 'Savings',
    type: 'Savings Bucket',
    initial_balance: 215000,
    is_active: true,
    institution_code: 'SAVINGS',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Income
  { id: 'cat-salary', name: 'Salary / Wages', classification: 'INCOME', color: '#10b981' },
  { id: 'cat-freelance', name: 'Freelance & Consulting', classification: 'INCOME', color: '#059669' },
  { id: 'cat-invest-inc', name: 'Investments / Dividends', classification: 'INCOME', color: '#34d399' },
  { id: 'cat-prev-bal', name: 'Previous Balance', classification: 'SYSTEM', color: '#64748b' },

  // Expenses
  { id: 'cat-rent', name: 'Housing & Rent', classification: 'EXPENSE', color: '#f59e0b' },
  { id: 'cat-groceries', name: 'Groceries & Food', classification: 'EXPENSE', color: '#ef4444' },
  { id: 'cat-utilities', name: 'Utilities & Bills', classification: 'EXPENSE', color: '#06b6d4' },
  { id: 'cat-transport', name: 'Transportation', classification: 'EXPENSE', color: '#8b5cf6' },
  { id: 'cat-shopping', name: 'Shopping & Personal', classification: 'EXPENSE', color: '#ec4899' },
  { id: 'cat-entertainment', name: 'Entertainment & Leisure', classification: 'EXPENSE', color: '#f97316' },
  { id: 'cat-healthcare', name: 'Healthcare & Medical', classification: 'EXPENSE', color: '#14b8a6' },
  { id: 'cat-travel', name: 'Travel', classification: 'EXPENSE', color: '#3b82f6' },
  { id: 'cat-future', name: 'Future expectation', classification: 'EXPENSE', color: '#a855f7' },
  { id: 'cat-misc', name: 'Miscellaneous', classification: 'EXPENSE', color: '#6b7280' },

  // System & Transfer
  { id: 'cat-transfer', name: 'Transfer', classification: 'SYSTEM', color: '#6366f1' },
];

/**
 * Generate comprehensive transaction history spanning Jan 2026 to Oct 2026
 * Reflecting real spreadsheet mechanics: recurring salary, rent, food, double-entry transfers,
 * ATM cash withdrawals, and dedicated savings allocations.
 */
function generateSeedTransactions(): Transaction[] {
  const transactions: Transaction[] = [];

  // Monthly recurring schedules for Jan (1) through Oct (10) 2026
  for (let m = 1; m <= 10; m++) {
    const monthStr = String(m).padStart(2, '0');
    const period = `2026-${monthStr}`;

    // 1. Salary Credit on Day 1 to HDFC
    transactions.push({
      id: `tx-salary-${m}`,
      timestamp: `2026-${monthStr}-01T09:00:00Z`,
      date: `2026-${monthStr}-01`,
      month_period: period,
      day: 1,
      category_id: 'cat-salary',
      type: 'Income',
      amount: 145000,
      from_account: 'acc-hdfc',
      to_account: null,
      notes: `Monthly Tech Salary Credit - Month ${m}`,
    });

    // 2. Rent Outflow on Day 3 from HDFC
    transactions.push({
      id: `tx-rent-${m}`,
      timestamp: `2026-${monthStr}-03T11:00:00Z`,
      date: `2026-${monthStr}-03`,
      month_period: period,
      day: 3,
      category_id: 'cat-rent',
      type: 'Expense',
      amount: 32000,
      from_account: 'acc-hdfc',
      to_account: null,
      notes: 'Apartment rent transfer via IMPS',
    });

    // 3. Transfer from HDFC to Dedicated Savings on Day 4
    transactions.push({
      id: `tx-savings-alloc-${m}`,
      timestamp: `2026-${monthStr}-04T10:30:00Z`,
      date: `2026-${monthStr}-04`,
      month_period: period,
      day: 4,
      category_id: 'cat-transfer',
      type: 'Transfer',
      amount: 40000,
      from_account: 'acc-hdfc',
      to_account: 'acc-savings',
      notes: 'Monthly strategic emergency/liquid fund allocation',
    });

    // 4. Transfer from HDFC to BOI on Day 5 for household utility operations
    transactions.push({
      id: `tx-transfer-boi-${m}`,
      timestamp: `2026-${monthStr}-05T14:15:00Z`,
      date: `2026-${monthStr}-05`,
      month_period: period,
      day: 5,
      category_id: 'cat-transfer',
      type: 'Transfer',
      amount: 25000,
      from_account: 'acc-hdfc',
      to_account: 'acc-boi',
      notes: 'Household operations balance top-up',
    });

    // 5. Utilities & Bills from BOI on Day 8
    transactions.push({
      id: `tx-util-${m}`,
      timestamp: `2026-${monthStr}-08T16:00:00Z`,
      date: `2026-${monthStr}-08`,
      month_period: period,
      day: 8,
      category_id: 'cat-utilities',
      type: 'Expense',
      amount: 7200,
      from_account: 'acc-boi',
      to_account: null,
      notes: 'Electricity, High-speed fiber broadband & piped gas',
    });

    // 6. ATM Cash Withdrawal (Transfer from SBI to Cash) on Day 10
    transactions.push({
      id: `tx-atm-cash-${m}`,
      timestamp: `2026-${monthStr}-10T12:00:00Z`,
      date: `2026-${monthStr}-10`,
      month_period: period,
      day: 10,
      category_id: 'cat-transfer',
      type: 'Transfer',
      amount: 8000,
      from_account: 'acc-sbi',
      to_account: 'acc-cash',
      notes: 'ATM debit cash withdrawal for street vendors & emergency cash',
    });

    // 7. Groceries & Supermarket from Axis on Day 12
    transactions.push({
      id: `tx-groc-1-${m}`,
      timestamp: `2026-${monthStr}-12T18:45:00Z`,
      date: `2026-${monthStr}-12`,
      month_period: period,
      day: 12,
      category_id: 'cat-groceries',
      type: 'Expense',
      amount: 8400,
      from_account: 'acc-axis',
      to_account: null,
      notes: 'Monthly staples, organic pantry & dairy',
    });

    // 8. Transportation from BOI (Metro / Fuel card) on Day 15
    transactions.push({
      id: `tx-trans-${m}`,
      timestamp: `2026-${monthStr}-15T09:30:00Z`,
      date: `2026-${monthStr}-15`,
      month_period: period,
      day: 15,
      category_id: 'cat-transport',
      type: 'Expense',
      amount: 4600,
      from_account: 'acc-boi',
      to_account: null,
      notes: 'Fastag recharge & monthly metro transit pass',
    });

    // 9. Groceries via Cash on Day 18
    transactions.push({
      id: `tx-groc-cash-${m}`,
      timestamp: `2026-${monthStr}-18T17:15:00Z`,
      date: `2026-${monthStr}-18`,
      month_period: period,
      day: 18,
      category_id: 'cat-groceries',
      type: 'Expense',
      amount: 3200,
      from_account: 'acc-cash',
      to_account: null,
      notes: 'Fresh local farmers market fruits & vegetables',
    });

    // 10. Dining & Entertainment from Axis on Day 21
    transactions.push({
      id: `tx-ent-${m}`,
      timestamp: `2026-${monthStr}-21T21:00:00Z`,
      date: `2026-${monthStr}-21`,
      month_period: period,
      day: 21,
      category_id: 'cat-entertainment',
      type: 'Expense',
      amount: 4800,
      from_account: 'acc-axis',
      to_account: null,
      notes: 'Weekend dinner with friends & cinema tickets',
    });

    // 11. Shopping & Personal from HDFC on Day 23
    transactions.push({
      id: `tx-shop-${m}`,
      timestamp: `2026-${monthStr}-23T15:20:00Z`,
      date: `2026-${monthStr}-23`,
      month_period: period,
      day: 23,
      category_id: 'cat-shopping',
      type: 'Expense',
      amount: 6200,
      from_account: 'acc-hdfc',
      to_account: null,
      notes: 'Apparel & tech accessories',
    });

    // 12. Healthcare / Pharmacy on Day 25
    transactions.push({
      id: `tx-health-${m}`,
      timestamp: `2026-${monthStr}-25T11:45:00Z`,
      date: `2026-${monthStr}-25`,
      month_period: period,
      day: 25,
      category_id: 'cat-healthcare',
      type: 'Expense',
      amount: 2400,
      from_account: 'acc-axis',
      to_account: null,
      notes: 'Quarterly health supplements & medical prescription',
    });

    // Occasional freelance bonus or travel in certain months
    if (m === 3 || m === 6 || m === 9) {
      transactions.push({
        id: `tx-freelance-${m}`,
        timestamp: `2026-${monthStr}-14T14:00:00Z`,
        date: `2026-${monthStr}-14`,
        month_period: period,
        day: 14,
        category_id: 'cat-freelance',
        type: 'Income',
        amount: 35000,
        from_account: 'acc-sbi',
        to_account: null,
        notes: 'Consulting milestone payout for cloud architecture audit',
      });
    }

    if (m === 5 || m === 8) {
      transactions.push({
        id: `tx-travel-${m}`,
        timestamp: `2026-${monthStr}-27T10:00:00Z`,
        date: `2026-${monthStr}-27`,
        month_period: period,
        day: 27,
        category_id: 'cat-travel',
        type: 'Expense',
        amount: 18500,
        from_account: 'acc-hdfc',
        to_account: null,
        notes: 'Domestic flight tickets and weekend resort stay',
      });
    }

    // Direct Savings entry
    transactions.push({
      id: `tx-direct-savings-${m}`,
      timestamp: `2026-${monthStr}-28T09:00:00Z`,
      date: `2026-${monthStr}-28`,
      month_period: period,
      day: 28,
      category_id: 'cat-future',
      type: 'Savings',
      amount: 10000,
      from_account: 'acc-hdfc',
      to_account: null,
      notes: 'Systematic mutual fund SIP deposit',
    });
  }

  // Current Day specifics for October 25, 2026 (matching additional metadata time)
  transactions.push({
    id: 'tx-oct25-coffee',
    timestamp: '2026-10-25T08:30:00Z',
    date: '2026-10-25',
    month_period: '2026-10',
    day: 25,
    category_id: 'cat-groceries',
    type: 'Expense',
    amount: 450,
    from_account: 'acc-axis',
    to_account: null,
    notes: 'Morning artisan cafe breakfast & espresso',
  });

  transactions.push({
    id: 'tx-oct25-fuel',
    timestamp: '2026-10-25T11:00:00Z',
    date: '2026-10-25',
    month_period: '2026-10',
    day: 25,
    category_id: 'cat-transport',
    type: 'Expense',
    amount: 1200,
    from_account: 'acc-boi',
    to_account: null,
    notes: 'Vehicle petrol refill at Bharat Petroleum',
  });

  return transactions;
}

export const INITIAL_TRANSACTIONS: Transaction[] = generateSeedTransactions();
