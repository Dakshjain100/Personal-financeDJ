/**
 * Format currency in Indian Rupee format (en-IN)
 * e.g., 125000 -> ₹1,25,000.00
 */
export function formatINR(amount: number, hideDecimals = false): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hideDecimals ? 0 : 2,
    maximumFractionDigits: hideDecimals ? 0 : 2,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format currency respecting Privacy Mode
 */
export function formatCurrencyValue(amount: number, isPrivacyActive: boolean, hideDecimals = false): string {
  if (isPrivacyActive) {
    return '₹ ••••••';
  }
  return formatINR(amount, hideDecimals);
}

/**
 * Format signed currency value (e.g., +₹4,500 or -₹1,200)
 */
export function formatSignedINR(amount: number, isPrivacyActive: boolean): string {
  if (isPrivacyActive) {
    return '₹ ••••••';
  }
  if (amount > 0) {
    return `+${formatINR(amount)}`;
  }
  if (amount < 0) {
    return formatINR(amount);
  }
  return formatINR(0);
}

/**
 * Get days count in a given month of a year
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Convert Date to YYYY-MM-DD
 */
export function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format date nicely e.g. "25 Oct 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const shortMonth = MONTH_SHORT_NAMES[m - 1] || '';
  return `${d} ${shortMonth} ${y}`;
}

/**
 * Generate CSV data from transactions
 */
export function exportTransactionsToCSV(
  transactions: Array<{
    date: string;
    day: number;
    month_period: string;
    type: string;
    amount: number;
    categoryName: string;
    fromAccountName: string;
    toAccountName: string;
    notes: string;
  }>
): string {
  const headers = [
    'Date',
    'Day',
    'Month Period',
    'Type',
    'Amount (INR)',
    'Category',
    'From Account',
    'To Account',
    'Notes'
  ];

  const rows = transactions.map(t => [
    `"${t.date}"`,
    t.day,
    `"${t.month_period}"`,
    `"${t.type}"`,
    t.amount.toFixed(2),
    `"${(t.categoryName || '').replace(/"/g, '""')}"`,
    `"${(t.fromAccountName || '').replace(/"/g, '""')}"`,
    `"${(t.toAccountName || '').replace(/"/g, '""')}"`,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
