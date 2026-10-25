import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrencyValue, formatSignedINR } from '../utils/formatters';
import { Building2, Wallet, Vault, ArrowRightLeft, ShieldCheck, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Account } from '../types/finance';

interface AccountLiquidityGridProps {
  onQuickTransfer?: (fromAccountId: string) => void;
}

export const AccountLiquidityGrid: React.FC<AccountLiquidityGridProps> = ({ onQuickTransfer }) => {
  const {
    accounts,
    accountBalances,
    filters,
    setFilterProp,
    isPrivacyActive,
    totalLiquidBalance,
    coreFourBalance,
    isCoreFourAccount,
  } = useFinance();

  const isDayNet = filters.balanceMode === 'DAY_NET';
  const isCoreOnly = filters.balanceScope === 'BOI_CASH_AXIS_SBI';

  const getAccountIcon = (account: Account) => {
    const typeLower = (account.type || '').toLowerCase();
    const nameLower = (account.name || '').toLowerCase();
    if (typeLower.includes('cash') || nameLower.includes('cash')) {
      return <Wallet className="w-4 h-4 text-emerald-400" />;
    }
    if (typeLower.includes('saving') && (typeLower.includes('bucket') || nameLower.includes('savings') || nameLower.includes('vault'))) {
      return <Vault className="w-4 h-4 text-indigo-400" />;
    }
    return <Building2 className="w-4 h-4 text-sky-400" />;
  };

  const coreFourDisplay = isDayNet ? coreFourBalance.dayNet : coreFourBalance.tillDate;
  const totalLiquidDisplay = isDayNet ? totalLiquidBalance : totalLiquidBalance;

  return (
    <div className="space-y-3">
      {/* Header with Balance Option Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">
            Account Liquidity & Cash Reserves
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isDayNet
              ? 'Showing Day Net Movement (Inflows - Outflows on selected date window)'
              : 'Real-time multi-account balance matrix (Till Date cumulative)'}
          </p>
        </div>

        {/* Balance Scope Option Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Balance View:</span>
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setFilterProp('balanceScope', 'ALL')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium whitespace-nowrap ${
                !isCoreOnly
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Liquid Accounts
            </button>
            <button
              type="button"
              onClick={() => setFilterProp('balanceScope', 'BOI_CASH_AXIS_SBI')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer font-medium whitespace-nowrap flex items-center gap-1.5 ${
                isCoreOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Balance (BOI + Cash + Axis + SBI)"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isCoreOnly ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>Balance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Bank / Cash Cards and Highlighted Balance Options */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
        {accounts.map(acc => {
          const balanceData = accountBalances[acc.id] || { current: 0, tillDate: 0, dayNet: 0 };
          const displayValue = isDayNet ? balanceData.dayNet : balanceData.tillDate;
          const isPartOfCoreFour = isCoreFourAccount(acc);

          return (
            <div
              key={acc.id}
              className={`rounded-xl p-3 flex flex-col justify-between transition-all relative group ${
                isCoreOnly && isPartOfCoreFour
                  ? 'bg-slate-800/95 border-2 border-emerald-500/60 shadow-sm shadow-emerald-950/20'
                  : isCoreOnly && !isPartOfCoreFour
                  ? 'bg-slate-800/50 border border-slate-800 opacity-75'
                  : 'bg-slate-800/90 border border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded bg-slate-900/60">{getAccountIcon(acc)}</div>
                  <span className="font-bold text-sm text-white tracking-tight">{acc.name}</span>
                </div>
                {isPartOfCoreFour && (
                  <span className={`text-[9px] font-mono font-semibold px-1 rounded ${
                    isCoreOnly
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400'
                  }`}>
                    Core
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div
                  className={`text-base font-bold font-mono tracking-tight tabular-nums ${
                    isDayNet
                      ? displayValue > 0
                        ? 'text-emerald-400'
                        : displayValue < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                      : displayValue >= 0
                      ? 'text-slate-100'
                      : 'text-rose-400'
                  }`}
                >
                  {isDayNet
                    ? formatSignedINR(displayValue, isPrivacyActive)
                    : formatCurrencyValue(displayValue, isPrivacyActive, true)}
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[90px]" title={acc.type}>
                    {acc.type}
                  </span>
                  {onQuickTransfer && (
                    <button
                      type="button"
                      onClick={() => onQuickTransfer(acc.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-300 transition-opacity p-0.5 cursor-pointer"
                      title={`Quick transfer from ${acc.name}`}
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Option 1: Balance (BOI + CASH + AXIS + SBI) Card */}
        <div
          onClick={() => setFilterProp('balanceScope', 'BOI_CASH_AXIS_SBI')}
          className={`border rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer relative ${
            isCoreOnly
              ? 'bg-gradient-to-br from-emerald-950/60 via-slate-800 to-slate-800 border-emerald-400 shadow-md ring-1 ring-emerald-400/50'
              : 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/40'
          }`}
          title="Click to activate Balance mode (BOI + Cash + Axis + SBI)"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded ${isCoreOnly ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-700 text-emerald-400'}`}>
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-emerald-300 whitespace-nowrap">
                Balance
              </span>
            </div>
            {isCoreOnly && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </div>

          <div className="mt-2.5">
            <div
              className={`text-base font-bold font-mono tracking-tight tabular-nums ${
                coreFourDisplay >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {isDayNet
                ? formatSignedINR(coreFourDisplay, isPrivacyActive)
                : formatCurrencyValue(coreFourDisplay, isPrivacyActive, true)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 truncate">
              {isDayNet ? 'Day net (Balance)' : 'BOI + Cash + Axis + SBI'}
            </div>
          </div>
        </div>

        {/* Option 2: Total Liquid (All Banks + Cash) Balance Card */}
        <div
          onClick={() => setFilterProp('balanceScope', 'ALL')}
          className={`border rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer relative ${
            !isCoreOnly
              ? 'bg-gradient-to-br from-sky-950/50 via-slate-800 to-slate-800 border-sky-400 shadow-md ring-1 ring-sky-400/40'
              : 'bg-slate-800/80 border-slate-700/80 hover:border-sky-500/40'
          }`}
          title="Click to activate All Liquid accounts balance mode"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <div className={`p-1 rounded ${!isCoreOnly ? 'bg-sky-500/30 text-sky-300' : 'bg-slate-700 text-sky-400'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-sky-300 whitespace-nowrap">
                Total Liquid
              </span>
            </div>
            {!isCoreOnly && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            )}
          </div>

          <div className="mt-2.5">
            <div
              className={`text-base font-bold font-mono tracking-tight tabular-nums ${
                totalLiquidDisplay >= 0 ? 'text-sky-300' : 'text-rose-400'
              }`}
            >
              {isDayNet
                ? formatSignedINR(totalLiquidDisplay, isPrivacyActive)
                : formatCurrencyValue(totalLiquidDisplay, isPrivacyActive, true)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 truncate">
              {isDayNet ? 'Day net (All)' : 'All Banks + Cash'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
