import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import {
  parseExcelFile,
  parsePastedExcelText,
  convertRowsToTransactions,
  linkLocalFilePicker,
  unlinkLocalFile,
  downloadExcelWorkbook,
  ColumnMapping,
  ParsedExcelResult
} from '../utils/excelSync';
import {
  initAuth,
  googleSignIn,
  googleLogout,
  getAccessToken
} from '../services/googleAuth';
import {
  createRupeeFlowSpreadsheet,
  pushDataToGoogleSheet,
  pullDataFromGoogleSheet,
  getSpreadsheetDetails,
  extractSpreadsheetId,
  GoogleSpreadsheetInfo
} from '../services/googleSheetsService';
import {
  FileSpreadsheet,
  Upload,
  ClipboardPaste,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Link,
  Unlink,
  ArrowRight,
  ExternalLink,
  Cloud,
  LogOut,
  Plus
} from 'lucide-react';
import { User } from 'firebase/auth';

interface ExcelSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_GSHEET_KEY = 'rupeeflow_linked_gsheet_id';

export const ExcelSyncModal: React.FC<ExcelSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    categories,
    transactions,
    importTransactions,
    isExcelLinked,
    linkedExcelName,
    setIsExcelLinked,
    syncWithLinkedExcel,
    setIsGSheetLinked
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'local_sync' | 'google_sheets'>('google_sheets');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedExcelResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: '',
    amountCol: '',
    typeCol: '',
    categoryCol: '',
    fromAccountCol: '',
    toAccountCol: '',
    notesCol: '',
  });
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Paste Text State
  const [pastedText, setPastedText] = useState('');
  const [pastedParsedResult, setPastedParsedResult] = useState<ParsedExcelResult | null>(null);

  // Google Sheets State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [linkedGSheet, setLinkedGSheet] = useState<GoogleSpreadsheetInfo | null>(null);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [autoSyncGSheets, setAutoSyncGSheets] = useState(true);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasGoogleToken(!!token);
      },
      () => {
        setCurrentUser(null);
        setHasGoogleToken(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Check stored Google Sheet ID on open
  useEffect(() => {
    if (isOpen) {
      const savedSheetId = localStorage.getItem(STORAGE_GSHEET_KEY);
      if (savedSheetId && hasGoogleToken) {
        getSpreadsheetDetails(savedSheetId)
          .then(info => {
            setLinkedGSheet(info);
            setIsGSheetLinked(true, info.title);
          })
          .catch(() => {
            localStorage.removeItem(STORAGE_GSHEET_KEY);
            setIsGSheetLinked(false, null);
          });
      }
    }
  }, [isOpen, hasGoogleToken]);

  if (!isOpen) return null;

  // Handle File Input Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      const res = await parseExcelFile(file);
      setParsedResult(res);
      setMapping(res.detectedMapping);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Failed to parse Excel file: ${err.message || 'Invalid format'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Pasted Text Parsing
  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    try {
      const res = parsePastedExcelText(pastedText.trim());
      setPastedParsedResult(res);
      setMapping(res.detectedMapping);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Failed to parse pasted data: ${err.message}` });
    }
  };

  // Perform Import
  const handleExecuteImport = (sourceResult: ParsedExcelResult) => {
    setIsProcessing(true);
    try {
      const { transactions: newTxs, newAccounts, newCategories } = convertRowsToTransactions(
        sourceResult.rawRows,
        mapping,
        accounts,
        categories
      );

      if (newTxs.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'No valid transactions found. Please verify column mappings (especially Amount and Date).'
        });
        setIsProcessing(false);
        return;
      }

      importTransactions(newTxs, replaceExisting, newAccounts, newCategories);

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${newTxs.length} transactions!${
          newAccounts.length > 0 ? ` Added ${newAccounts.length} new accounts.` : ''
        }`
      });

      setSelectedFile(null);
      setParsedResult(null);
      setPastedText('');
      setPastedParsedResult(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Import failed: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // Link Local File for 2-Way Sync
  const handleLinkLocalFile = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await linkLocalFilePicker();
      if (res.success && res.fileName) {
        setIsExcelLinked(true, res.fileName);
        setStatusMessage({
          type: 'success',
          text: `Linked to "${res.fileName}"! Live two-way sync is active.`
        });
        if (res.parsedResult && res.parsedResult.rawRows.length > 0) {
          setParsedResult(res.parsedResult);
          setMapping(res.parsedResult.detectedMapping);
        }
      } else if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to link file.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlinkLocalFile = () => {
    unlinkLocalFile();
    setIsExcelLinked(false, null);
    setStatusMessage({ type: 'success', text: 'Local file unlinked.' });
  };

  const handleManualPush = async () => {
    setIsProcessing(true);
    try {
      const res = await syncWithLinkedExcel();
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'All transactions saved to your linked Excel file!' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to write to file.' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadExcel = () => {
    downloadExcelWorkbook(transactions, accounts, categories, 'RupeeFlow_Finance_Ledger.xlsx');
  };

  // --- GOOGLE SHEETS HANDLERS ---
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasGoogleToken(true);
        setStatusMessage({ type: 'success', text: `Signed in as ${res.user.email}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Google Sign-In failed.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await googleLogout();
    setCurrentUser(null);
    setHasGoogleToken(false);
    setLinkedGSheet(null);
    localStorage.removeItem(STORAGE_GSHEET_KEY);
    setIsGSheetLinked(false, null);
    setStatusMessage({ type: 'success', text: 'Signed out from Google.' });
  };

  const handleCreateNewGoogleSheet = async () => {
    setIsGoogleLoading(true);
    setStatusMessage(null);
    try {
      const sheet = await createRupeeFlowSpreadsheet(
        'RupeeFlow Financial Ledger (2026)',
        transactions,
        accounts,
        categories
      );
      setLinkedGSheet(sheet);
      localStorage.setItem(STORAGE_GSHEET_KEY, sheet.id);
      setIsGSheetLinked(true, sheet.title);
      setStatusMessage({
        type: 'success',
        text: `Created and linked Google Spreadsheet: "${sheet.title}" with ${transactions.length} entries!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create Google Sheet.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleConnectExistingGoogleSheet = async () => {
    if (!sheetUrlInput.trim()) return;
    setIsGoogleLoading(true);
    setStatusMessage(null);
    try {
      const sheetId = extractSpreadsheetId(sheetUrlInput);
      const sheetInfo = await getSpreadsheetDetails(sheetId);
      setLinkedGSheet(sheetInfo);
      localStorage.setItem(STORAGE_GSHEET_KEY, sheetInfo.id);
      setIsGSheetLinked(true, sheetInfo.title);
      setSheetUrlInput('');
      setStatusMessage({
        type: 'success',
        text: `Connected to Google Sheet: "${sheetInfo.title}".`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to connect to Google Sheet.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Push to Google Sheet with confirmation dialog
  const handlePushToGoogleSheet = async () => {
    if (!linkedGSheet) return;

    const confirmed = window.confirm(
      `Update Google Sheet "${linkedGSheet.title}" with ${transactions.length} transactions from RupeeFlow? Existing data in Transactions, Accounts, and Categories tabs will be synchronized.`
    );
    if (!confirmed) return;

    setIsGoogleLoading(true);
    try {
      const res = await pushDataToGoogleSheet(linkedGSheet.id, transactions, accounts, categories);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Updated Google Sheet with ${transactions.length} transactions!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update Google Sheet.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Pull from Google Sheet with confirmation dialog
  const handlePullFromGoogleSheet = async () => {
    if (!linkedGSheet) return;

    const confirmed = window.confirm(
      `Pull transactions from Google Sheet "${linkedGSheet.title}" into RupeeFlow?`
    );
    if (!confirmed) return;

    setIsGoogleLoading(true);
    try {
      const res = await pullDataFromGoogleSheet(linkedGSheet.id, accounts, categories);
      if (res.transactions.length === 0) {
        setStatusMessage({
          type: 'error',
          text: 'No transaction rows found in the Google Sheet. Please check the sheet headers.',
        });
        return;
      }

      importTransactions(res.transactions, replaceExisting, res.newAccounts, res.newCategories);
      setStatusMessage({
        type: 'success',
        text: `Successfully synced ${res.transactions.length} transactions from Google Sheet!`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to pull from Google Sheet.' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDisconnectGoogleSheet = () => {
    setLinkedGSheet(null);
    localStorage.removeItem(STORAGE_GSHEET_KEY);
    setIsGSheetLinked(false, null);
    setStatusMessage({ type: 'success', text: 'Google Sheet disconnected from RupeeFlow.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>Spreadsheet Sync: Google Sheets & Excel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live two-way synchronization with Google Sheets, local Excel files, or manual import
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/60 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('google_sheets'); setStatusMessage(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'google_sheets'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets Sync {linkedGSheet && '●'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setStatusMessage(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.xlsx / .csv)</span>
          </button>
          <button
            onClick={() => { setActiveTab('local_sync'); setStatusMessage(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'local_sync'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Local Excel Sync {isExcelLinked && '●'}</span>
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setStatusMessage(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste from Excel</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: GOOGLE SHEETS LIVE SYNC */}
          {activeTab === 'google_sheets' && (
            <div className="space-y-4">
              {!currentUser || !hasGoogleToken ? (
                <div className="p-6 border border-slate-800 rounded-2xl bg-slate-800/40 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Connect Google Sheets</h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Sign in with your Google account to enable live two-way synchronization. Any entry made in RupeeFlow can update your Google Sheet in real time.
                    </p>
                  </div>

                  {/* Standard Sign in with Google Button */}
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="inline-flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer border border-slate-300"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* User Profile Bar */}
                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full border border-slate-600"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                          {currentUser.email?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">{currentUser.displayName || 'Google User'}</div>
                        <div className="text-[11px] text-slate-400">{currentUser.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={handleGoogleLogout}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>

                  {/* Connected Spreadsheet Status */}
                  {linkedGSheet ? (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <h4 className="text-sm font-bold text-white">{linkedGSheet.title}</h4>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Tabs: {linkedGSheet.sheetNames.join(', ')}
                          </p>
                        </div>
                        <a
                          href={linkedGSheet.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg border border-emerald-500/30 cursor-pointer"
                        >
                          <span>Open in Sheets</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <button
                          onClick={handlePushToGoogleSheet}
                          disabled={isGoogleLoading}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Push {transactions.length} Entries to Google Sheet</span>
                        </button>

                        <button
                          onClick={handlePullFromGoogleSheet}
                          disabled={isGoogleLoading}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Pull / Sync from Google Sheet</span>
                        </button>

                        <button
                          onClick={handleDisconnectGoogleSheet}
                          className="px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        >
                          Disconnect Sheet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Option A: Create New Sheet */}
                      <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-emerald-400" />
                          <span>Create a New Google Spreadsheet</span>
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Automatically generates a brand new Google Sheet in your Google Drive with formatted <em>Transactions</em>, <em>Accounts</em>, and <em>Categories</em> tabs, preloaded with all your current data.
                        </p>
                        <button
                          onClick={handleCreateNewGoogleSheet}
                          disabled={isGoogleLoading}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition-colors cursor-pointer mt-1"
                        >
                          <Cloud className="w-4 h-4" />
                          <span>Create & Link New Google Sheet</span>
                        </button>
                      </div>

                      {/* Option B: Connect Existing Sheet */}
                      <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-2">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Link className="w-4 h-4 text-emerald-400" />
                          <span>Or Connect an Existing Google Sheet</span>
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Paste the URL or Spreadsheet ID of your existing Google Sheet:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5..."
                            value={sheetUrlInput}
                            onChange={e => setSheetUrlInput(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-400"
                          />
                          <button
                            onClick={handleConnectExistingGoogleSheet}
                            disabled={isGoogleLoading || !sheetUrlInput.trim()}
                            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl cursor-pointer"
                          >
                            Connect
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD FILE (.xlsx / .csv) */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!parsedResult ? (
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center transition-colors">
                  <FileSpreadsheet className="w-12 h-12 text-emerald-400/80 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white mb-1">
                    Select your Excel spreadsheet (.xlsx, .xls, or .csv)
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                    RupeeFlow automatically reads your sheets and column headers (Date, Amount, Category, Bank/Account, Type, Memo)
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs transition-colors cursor-pointer shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>Choose Excel File</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-white">{selectedFile?.name}</span>
                      <span className="text-slate-400 ml-2">
                        ({parsedResult.rawRows.length} rows found)
                      </span>
                    </div>
                    <button
                      onClick={() => { setSelectedFile(null); setParsedResult(null); }}
                      className="text-xs text-rose-400 hover:underline cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>

                  <div className="p-4 bg-slate-800/50 border border-slate-700/80 rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-slate-200">Verify Column Mappings</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Date Column</label>
                        <select
                          value={mapping.dateCol}
                          onChange={e => setMapping(prev => ({ ...prev, dateCol: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">-- Select --</option>
                          {parsedResult.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Amount Column *</label>
                        <select
                          value={mapping.amountCol}
                          onChange={e => setMapping(prev => ({ ...prev, amountCol: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold"
                        >
                          <option value="">-- Select --</option>
                          {parsedResult.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Type Column</label>
                        <select
                          value={mapping.typeCol}
                          onChange={e => setMapping(prev => ({ ...prev, typeCol: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">(Auto-detect)</option>
                          {parsedResult.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Category Column</label>
                        <select
                          value={mapping.categoryCol}
                          onChange={e => setMapping(prev => ({ ...prev, categoryCol: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">(Default: Misc)</option>
                          {parsedResult.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Account Column</label>
                        <select
                          value={mapping.fromAccountCol}
                          onChange={e => setMapping(prev => ({ ...prev, fromAccountCol: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">(Default: Cash)</option>
                          {parsedResult.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Memo / Notes</label>
                        <select
                          value={mapping.notesCol}
                          onChange={e => setMapping(prev => ({ ...prev, notesCol: e.target.value }))}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">(Optional)</option>
                          {parsedResult.headers.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={e => setReplaceExisting(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-400 focus:ring-emerald-400 cursor-pointer"
                      />
                      <span>Replace existing transactions (otherwise appends)</span>
                    </label>

                    <button
                      onClick={() => handleExecuteImport(parsedResult)}
                      disabled={isProcessing || !mapping.amountCol}
                      className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Import {parsedResult.rawRows.length} Rows</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOCAL FILE TWO-WAY SYNC */}
          {activeTab === 'local_sync' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isExcelLinked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                      {isExcelLinked ? <Link className="w-5 h-5" /> : <Unlink className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        {isExcelLinked ? `Linked File: ${linkedExcelName}` : 'No Local File Currently Linked'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isExcelLinked
                          ? 'Automatic Two-Way Sync Active: every entry added in RupeeFlow automatically writes to your Excel file on disk.'
                          : 'Connect your local .xlsx or .csv file to enable instant background two-way file synchronization.'}
                      </p>
                    </div>
                  </div>

                  {isExcelLinked && (
                    <button
                      onClick={handleUnlinkLocalFile}
                      className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Unlink"
                    >
                      Unlink
                    </button>
                  )}
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  {!isExcelLinked ? (
                    <button
                      onClick={handleLinkLocalFile}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                      <Link className="w-4 h-4" />
                      <span>Link Local Excel File (.xlsx / .csv)</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleManualPush}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Push App Data to Excel</span>
                      </button>
                      <button
                        onClick={handleLinkLocalFile}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>Re-read / Pull from Excel</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleDownloadExcel}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel Workbook</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PASTE FROM EXCEL */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Copy rows from Excel and paste here:
                </label>
                <textarea
                  rows={6}
                  placeholder={`Date\tType\tAmount\tCategory\tFrom Account\tNotes\n2026-10-15\tExpense\t4500\tGroceries\tAxis\tWeekly organic market`}
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono placeholder:text-slate-500 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleParsePastedText}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Parse Pasted Rows
                </button>
              </div>

              {pastedParsedResult && (
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300">
                      Found {pastedParsedResult.rawRows.length} rows to import
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replaceExisting}
                        onChange={e => setReplaceExisting(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-400 focus:ring-emerald-400 cursor-pointer"
                      />
                      <span>Replace existing</span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleExecuteImport(pastedParsedResult)}
                    disabled={isProcessing}
                    className="w-full py-2 text-xs font-semibold bg-emerald-400 text-slate-950 rounded-xl hover:bg-emerald-300 transition-colors cursor-pointer"
                  >
                    Confirm & Add {pastedParsedResult.rawRows.length} Entries
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <button
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .xlsx copy</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
