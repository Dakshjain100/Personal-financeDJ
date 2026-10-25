import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrencyValue } from '../utils/formatters';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Percent, Scale } from 'lucide-react';

export const KpiCards: React.FC = () => {
  const { kpis, isPrivacyActive, filters } = useFinance();

  const periodLabel = filters.month === 'ALL'
    ? `Full Year ${filters.year}`
    : `${filters.year} · Month ${filters.month}${filters.day !== 'ALL' ? ` · Day ${filters.day}` : ''}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Inflow (Total Income) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Inflow (Income)</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
            {formatCurrencyValue(kpis.totalIncome, isPrivacyActive)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Period inflows</span>
            <span aria-hidden="true">·</span>
            <span>{periodLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. Outflow (Total Expenses) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Outflow (Expenses)</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-rose-400 tabular-nums">
            {formatCurrencyValue(kpis.totalExpense, isPrivacyActive)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Period burn</span>
            <span aria-hidden="true">·</span>
            <span>{kpis.transactionCount} entries</span>
          </div>
        </div>
      </div>

      {/* 3. Net Savings */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Net Savings Allocation</span>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-indigo-300 tabular-nums">
            {formatCurrencyValue(kpis.netSavings, isPrivacyActive)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Dedicated pool</span>
            <span aria-hidden="true">·</span>
            <span>SIP + Transfers</span>
          </div>
        </div>
      </div>

      {/* 4. Savings Rate % */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Savings Rate</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums">
              {isPrivacyActive ? '•••' : `${kpis.savingsRate.toFixed(1)}%`}
            </span>
            <span className="text-xs text-slate-400">of income</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-700/60 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, kpis.savingsRate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 5. Net Cash Flow */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Net Monthly Balance</span>
          <div className={`p-1.5 rounded-lg ${kpis.netCashFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
              kpis.netCashFlow >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {formatCurrencyValue(kpis.netCashFlow, isPrivacyActive)}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            <span>Inflows - Outflows - Savings</span>
          </div>
        </div>
      </div>
    </div>
  );
};
