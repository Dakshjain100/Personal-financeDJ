import { Transaction, Account, Category, TransactionType } from '../types/finance';
import { getAccessToken } from './googleAuth';
import { toISODateString } from '../utils/formatters';

export interface GoogleSpreadsheetInfo {
  id: string;
  title: string;
  url: string;
  sheetNames: string[];
}

/**
 * Extract Google Spreadsheet ID from a full URL or ID string
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Fetch spreadsheet metadata and verify access
 */
export async function getSpreadsheetDetails(spreadsheetId: string): Promise<GoogleSpreadsheetInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please sign in with Google.');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to access spreadsheet (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Google Sheet';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');

  return {
    id: spreadsheetId,
    title,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetNames,
  };
}

/**
 * Create a new Google Spreadsheet formatted for RupeeFlow
 */
export async function createRupeeFlowSpreadsheet(
  title: string,
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): Promise<GoogleSpreadsheetInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please sign in with Google.');

  // Create spreadsheet with tabs: Transactions, Accounts, Categories
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: title || 'RupeeFlow Financial Ledger' },
      sheets: [
        { properties: { title: 'Transactions' } },
        { properties: { title: 'Accounts' } },
        { properties: { title: 'Categories' } },
      ],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to create Google Spreadsheet.');
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;

  // Populate data
  await pushDataToGoogleSheet(spreadsheetId, transactions, accounts, categories);

  return {
    id: spreadsheetId,
    title: created.properties?.title || title,
    url: created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheetNames: ['Transactions', 'Accounts', 'Categories'],
  };
}

/**
 * Push all app data to the connected Google Spreadsheet
 */
export async function pushDataToGoogleSheet(
  spreadsheetId: string,
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): Promise<{ success: boolean; rowsUpdated: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please sign in with Google.');

  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // 1. Transactions Data
  const txHeaders = ['Date', 'Day', 'Month Period', 'Type', 'Amount (INR)', 'Category', 'From Account', 'To Account', 'Notes'];
  const txRows = transactions.map(t => [
    t.date,
    t.day,
    t.month_period,
    t.type,
    t.amount,
    categoryMap.get(t.category_id) || 'Uncategorized',
    accountMap.get(t.from_account) || 'Unknown',
    t.to_account ? accountMap.get(t.to_account) || '' : '',
    t.notes || '',
  ]);

  // 2. Accounts Data
  const accHeaders = ['Account Name', 'Account Type', 'Opening Balance (INR)', 'Last 4 Digits'];
  const accRows = accounts.map(a => [
    a.name,
    a.type,
    a.initial_balance,
    a.account_number_last4 || '',
  ]);

  // 3. Categories Data
  const catHeaders = ['Category Name', 'Classification'];
  const catRows = categories.map(c => [c.name, c.classification]);

  const batchData = [
    {
      range: 'Transactions!A1:I',
      values: [txHeaders, ...txRows],
    },
    {
      range: 'Accounts!A1:D',
      values: [accHeaders, ...accRows],
    },
    {
      range: 'Categories!A1:B',
      values: [catHeaders, ...catRows],
    },
  ];

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to update Google Sheet cells.');
  }

  const result = await updateRes.json();
  return {
    success: true,
    rowsUpdated: result.totalUpdatedRows || txRows.length,
  };
}

/**
 * Pull and parse transactions from Google Spreadsheet into RupeeFlow
 */
export async function pullDataFromGoogleSheet(
  spreadsheetId: string,
  existingAccounts: Account[],
  existingCategories: Category[]
): Promise<{
  transactions: Transaction[];
  newAccounts: Account[];
  newCategories: Category[];
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated. Please sign in with Google.');

  // Check spreadsheet metadata to find tab name
  const meta = await getSpreadsheetDetails(spreadsheetId);
  const targetSheet = meta.sheetNames.includes('Transactions') ? 'Transactions' : meta.sheetNames[0] || 'Sheet1';

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheet}!A1:Z10000`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Failed to read spreadsheet data.');
  }

  const data = await res.json();
  const values: string[][] = data.values || [];

  if (values.length < 2) {
    return { transactions: [], newAccounts: [], newCategories: [] };
  }

  const headers = values[0].map(h => h.trim().toLowerCase());
  const rows = values.slice(1);

  // Identify column indices
  const findCol = (candidates: string[]) => {
    return headers.findIndex(h => candidates.some(c => h.includes(c)));
  };

  const dateIdx = findCol(['date', 'txn date', 'day']);
  const amountIdx = findCol(['amount', 'inr', 'value', 'price', 'total']);
  const typeIdx = findCol(['type', 'flow']);
  const catIdx = findCol(['category', 'head']);
  const fromAccIdx = findCol(['from', 'account', 'bank', 'source']);
  const toAccIdx = findCol(['to', 'destination', 'target']);
  const notesIdx = findCol(['notes', 'memo', 'description', 'particulars']);

  const accountMap = new Map<string, Account>();
  const categoryMap = new Map<string, Category>();

  existingAccounts.forEach(a => accountMap.set(a.name.toLowerCase().trim(), a));
  existingCategories.forEach(c => categoryMap.set(c.name.toLowerCase().trim(), c));

  const newAccounts: Account[] = [];
  const newCategories: Category[] = [];

  const getOrCreateAccount = (name: string): Account => {
    const cleanName = (name || 'Cash').trim();
    const key = cleanName.toLowerCase();
    if (accountMap.has(key)) return accountMap.get(key)!;

    const newAcc: Account = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      type: cleanName.toLowerCase().includes('cash') ? 'Cash' : 'Saving',
      initial_balance: 0,
      is_active: true,
    };
    accountMap.set(key, newAcc);
    newAccounts.push(newAcc);
    return newAcc;
  };

  const getOrCreateCategory = (name: string, type: TransactionType): Category => {
    const cleanName = (name || 'Miscellaneous').trim();
    const key = cleanName.toLowerCase();
    if (categoryMap.has(key)) return categoryMap.get(key)!;

    const newCat: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      classification: type === 'Income' ? 'INCOME' : type === 'Transfer' ? 'SYSTEM' : 'EXPENSE',
    };
    categoryMap.set(key, newCat);
    newCategories.push(newCat);
    return newCat;
  };

  const transactions: Transaction[] = [];

  rows.forEach((row, idx) => {
    const rawAmount = row[amountIdx] || '0';
    const amount = Math.abs(parseFloat(rawAmount.replace(/[₹$,]/g, '').trim())) || 0;
    if (amount <= 0) return;

    let dateStr = toISODateString(new Date(2026, 9, 25));
    const rawDate = row[dateIdx];
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) dateStr = toISODateString(parsed);
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const day = d || 1;
    const monthStr = String(m || 1).padStart(2, '0');
    const month_period = `${y || 2026}-${monthStr}`;

    let type: TransactionType = 'Expense';
    const rawType = (row[typeIdx] || '').toLowerCase();
    if (rawType.includes('income') || rawType.includes('credit')) type = 'Income';
    else if (rawType.includes('transfer')) type = 'Transfer';
    else if (rawType.includes('saving')) type = 'Savings';

    const fromAcc = getOrCreateAccount(row[fromAccIdx] || 'Cash');
    let toAccId: string | null = null;
    if (type === 'Transfer' && row[toAccIdx]) {
      toAccId = getOrCreateAccount(row[toAccIdx]).id;
    }

    const cat = getOrCreateCategory(row[catIdx] || 'Miscellaneous', type);
    const notes = row[notesIdx] || '';

    transactions.push({
      id: `tx-gsheet-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      date: dateStr,
      month_period,
      day,
      category_id: cat.id,
      type,
      amount,
      from_account: fromAcc.id,
      to_account: toAccId,
      notes: notes.trim(),
    });
  });

  return { transactions, newAccounts, newCategories };
}
