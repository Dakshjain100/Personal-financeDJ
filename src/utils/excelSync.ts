import * as XLSX from 'xlsx';
import { Transaction, Account, Category, TransactionType } from '../types/finance';
import { toISODateString } from './formatters';

export interface ColumnMapping {
  dateCol: string;
  amountCol: string;
  typeCol: string;
  categoryCol: string;
  fromAccountCol: string;
  toAccountCol: string;
  notesCol: string;
}

export interface ParsedExcelResult {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  detectedMapping: ColumnMapping;
}

// Stored file handle for 2-way sync using File System Access API
let linkedFileHandle: any = null;
let linkedFileName: string | null = null;

/**
 * Read and parse an Excel (.xlsx, .xls) or CSV file
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  const sheetNames = workbook.SheetNames;
  const firstSheetName = sheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  // Extract all unique keys from rawRows
  const headerSet = new Set<string>();
  rawRows.forEach(row => {
    Object.keys(row).forEach(k => headerSet.add(k));
  });
  const headers = Array.from(headerSet);

  const detectedMapping = detectColumnMapping(headers);

  return {
    sheetNames,
    selectedSheet: firstSheetName,
    headers,
    rawRows,
    detectedMapping,
  };
}

/**
 * Parse tab-separated or comma-separated text pasted from Excel
 */
export function parsePastedExcelText(text: string): ParsedExcelResult {
  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheetName = workbook.SheetNames[0] || 'Sheet1';
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const headerSet = new Set<string>();
  rawRows.forEach(row => {
    Object.keys(row).forEach(k => headerSet.add(k));
  });
  const headers = Array.from(headerSet);
  const detectedMapping = detectColumnMapping(headers);

  return {
    sheetNames: [firstSheetName],
    selectedSheet: firstSheetName,
    headers,
    rawRows,
    detectedMapping,
  };
}

/**
 * Heuristics to auto-detect which column in the user's Excel corresponds to which field
 */
function detectColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    for (const cand of candidates) {
      const match = headers.find(h => h.trim().toLowerCase() === cand.toLowerCase());
      if (match) return match;
    }
    for (const cand of candidates) {
      const match = headers.find(h => h.trim().toLowerCase().includes(cand.toLowerCase()));
      if (match) return match;
    }
    return '';
  };

  return {
    dateCol: findMatch(['date', 'txn date', 'transaction date', 'effective date', 'day']),
    amountCol: findMatch(['amount', 'amount (inr)', 'inr', 'value', 'price', 'total', 'amt']),
    typeCol: findMatch(['type', 'txn type', 'transaction type', 'flow']),
    categoryCol: findMatch(['category', 'category name', 'head', 'sub category', 'expense type']),
    fromAccountCol: findMatch(['from account', 'from', 'account', 'bank', 'source account', 'source']),
    toAccountCol: findMatch(['to account', 'to', 'destination', 'target', 'transfer to']),
    notesCol: findMatch(['notes', 'memo', 'description', 'particulars', 'remark', 'details']),
  };
}

/**
 * Convert parsed rows into typed Transactions with auto account/category detection
 */
export function convertRowsToTransactions(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  existingAccounts: Account[],
  existingCategories: Category[]
): {
  transactions: Transaction[];
  newAccounts: Account[];
  newCategories: Category[];
} {
  const transactions: Transaction[] = [];
  const accountMap = new Map<string, Account>();
  const categoryMap = new Map<string, Category>();

  existingAccounts.forEach(a => {
    accountMap.set(a.name.toLowerCase().trim(), a);
    accountMap.set(a.id, a);
  });

  existingCategories.forEach(c => {
    categoryMap.set(c.name.toLowerCase().trim(), c);
    categoryMap.set(c.id, c);
  });

  const newAccounts: Account[] = [];
  const newCategories: Category[] = [];

  const getOrCreateAccount = (name: string): Account => {
    const cleanName = (name || 'Cash').trim();
    const key = cleanName.toLowerCase();
    if (accountMap.has(key)) {
      return accountMap.get(key)!;
    }

    const type = key.includes('cash')
      ? 'Cash'
      : key.includes('saving')
      ? 'Saving'
      : 'Current';

    const newAcc: Account = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      type: type,
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
    if (categoryMap.has(key)) {
      return categoryMap.get(key)!;
    }

    const classification = type === 'Income' ? 'INCOME' : type === 'Transfer' ? 'SYSTEM' : 'EXPENSE';
    const newCat: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      classification,
    };

    categoryMap.set(key, newCat);
    newCategories.push(newCat);
    return newCat;
  };

  rows.forEach((row, idx) => {
    // 1. Amount
    let rawAmount = row[mapping.amountCol];
    if (typeof rawAmount === 'string') {
      rawAmount = rawAmount.replace(/[₹$,]/g, '').trim();
    }
    const amount = Math.abs(parseFloat(rawAmount)) || 0;
    if (amount <= 0) return; // skip zero/invalid amount

    // 2. Date
    let dateStr = toISODateString(new Date(2026, 9, 25));
    const rawDate = row[mapping.dateCol];
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      dateStr = toISODateString(rawDate);
    } else if (typeof rawDate === 'string' && rawDate.trim()) {
      const parsedD = new Date(rawDate);
      if (!isNaN(parsedD.getTime())) {
        dateStr = toISODateString(parsedD);
      }
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const day = d || 1;
    const monthStr = String(m || 1).padStart(2, '0');
    const month_period = `${y || 2026}-${monthStr}`;

    // 3. Type
    let type: TransactionType = 'Expense';
    const rawType = (row[mapping.typeCol] || '').toString().toLowerCase();
    if (rawType.includes('income') || rawType.includes('salary') || rawType.includes('credit')) {
      type = 'Income';
    } else if (rawType.includes('transfer')) {
      type = 'Transfer';
    } else if (rawType.includes('saving') || rawType.includes('sip')) {
      type = 'Savings';
    } else if (rawType.includes('expense') || rawType.includes('debit')) {
      type = 'Expense';
    }

    // 4. Accounts
    const rawFrom = (row[mapping.fromAccountCol] || '').toString();
    const fromAcc = getOrCreateAccount(rawFrom);

    let toAccId: string | null = null;
    if (type === 'Transfer') {
      const rawTo = (row[mapping.toAccountCol] || '').toString();
      if (rawTo) {
        const toAcc = getOrCreateAccount(rawTo);
        toAccId = toAcc.id;
      }
    }

    // 5. Category
    const rawCategory = (row[mapping.categoryCol] || '').toString();
    const cat = getOrCreateCategory(rawCategory, type);

    // 6. Notes
    const notes = (row[mapping.notesCol] || '').toString();

    transactions.push({
      id: `tx-imported-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
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

/**
 * Generate a complete multi-sheet Excel Workbook with all data
 */
export function generateExcelWorkbook(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): XLSX.WorkBook {
  const accountMap = new Map(accounts.map(a => [a.id, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  // Sheet 1: Transactions Ledger
  const txData = transactions.map(t => ({
    'Date': t.date,
    'Day': t.day,
    'Month Period': t.month_period,
    'Type': t.type,
    'Amount (INR)': t.amount,
    'Category': categoryMap.get(t.category_id) || 'Uncategorized',
    'From Account': accountMap.get(t.from_account) || 'Unknown',
    'To Account': t.to_account ? accountMap.get(t.to_account) || '' : '',
    'Notes': t.notes || '',
  }));
  const txSheet = XLSX.utils.json_to_sheet(txData);

  // Sheet 2: Accounts & Balances
  const accData = accounts.map(a => ({
    'Account Name': a.name,
    'Account Type': a.type,
    'Opening Balance (INR)': a.initial_balance,
    'Status': a.is_active ? 'Active' : 'Inactive',
    'Last 4 Digits': a.account_number_last4 || '',
  }));
  const accSheet = XLSX.utils.json_to_sheet(accData);

  // Sheet 3: Categories
  const catData = categories.map(c => ({
    'Category Name': c.name,
    'Classification': c.classification,
  }));
  const catSheet = XLSX.utils.json_to_sheet(catData);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, txSheet, 'Transactions');
  XLSX.utils.book_append_sheet(workbook, accSheet, 'Accounts');
  XLSX.utils.book_append_sheet(workbook, catSheet, 'Categories');

  return workbook;
}

/**
 * Download updated Excel Workbook to user's computer
 */
export function downloadExcelWorkbook(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[],
  fileName = 'RupeeFlow_Finance_Ledger.xlsx'
) {
  const wb = generateExcelWorkbook(transactions, accounts, categories);
  XLSX.writeFile(wb, fileName);
}

/**
 * Link a local Excel or CSV file via Web File System Access API
 * (Enables 2-way live sync back to the file on disk!)
 */
export async function linkLocalFilePicker(): Promise<{
  success: boolean;
  fileName?: string;
  parsedResult?: ParsedExcelResult;
  error?: string;
}> {
  try {
    if (!('showOpenFilePicker' in window)) {
      return {
        success: false,
        error: 'The File System Access API is not supported in this browser. You can still use the Upload / Export feature for seamless sync!',
      };
    }

    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Excel or CSV Spreadsheet',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
          },
        },
      ],
      multiple: false,
    });

    if (!handle) {
      return { success: false, error: 'No file selected.' };
    }

    linkedFileHandle = handle;
    linkedFileName = handle.name;

    const file = await handle.getFile();
    const parsedResult = await parseExcelFile(file);

    return {
      success: true,
      fileName: handle.name,
      parsedResult,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'File selection cancelled.' };
    }
    return { success: false, error: err.message || 'Failed to link file.' };
  }
}

/**
 * Write updated data back to the linked local file on disk (Live Two-Way Sync!)
 */
export async function writeBackToLinkedFile(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): Promise<{ success: boolean; error?: string }> {
  if (!linkedFileHandle) {
    return { success: false, error: 'No local Excel file is currently linked.' };
  }

  try {
    const isCsv = (linkedFileName || '').toLowerCase().endsWith('.csv');
    let fileBuffer: Uint8Array;

    if (isCsv) {
      const accountMap = new Map(accounts.map(a => [a.id, a.name]));
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      const txData = transactions.map(t => ({
        'Date': t.date,
        'Day': t.day,
        'Month Period': t.month_period,
        'Type': t.type,
        'Amount (INR)': t.amount,
        'Category': categoryMap.get(t.category_id) || 'Uncategorized',
        'From Account': accountMap.get(t.from_account) || 'Unknown',
        'To Account': t.to_account ? accountMap.get(t.to_account) || '' : '',
        'Notes': t.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(txData);
      const csvStr = XLSX.utils.sheet_to_csv(ws);
      fileBuffer = new TextEncoder().encode(csvStr);
    } else {
      const wb = generateExcelWorkbook(transactions, accounts, categories);
      const wbOutput = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      fileBuffer = new Uint8Array(wbOutput);
    }

    const writable = await linkedFileHandle.createWritable();
    await writable.write(fileBuffer);
    await writable.close();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to write to linked file.' };
  }
}

export function getLinkedFileName(): string | null {
  return linkedFileName;
}

export function hasLinkedFile(): boolean {
  return linkedFileHandle !== null;
}

export function unlinkLocalFile(): void {
  linkedFileHandle = null;
  linkedFileName = null;
}
