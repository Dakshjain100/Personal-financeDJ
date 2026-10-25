import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrencyValue } from '../utils/formatters';
import { Landmark, Wallet, Vault, ShoppingBag, Layers } from 'lucide-react';

export const PortfolioAllocation: React.FC = () => {
  const { portfolioDistribution, isPrivacyActive } = useFinance();

  const { bankBalances, cashInHand, savingsPool, expensePool, totalPortfolio, percentages } =
    portfolioDistribution;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Financial Allocation Breakdown & Capital Health</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Holistic capital distribution across commercial banks, physical cash, dedicated savings reserves, and active expense burn
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Total Portfolio Value: </span>
          <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
            {formatCurrencyValue(totalPortfolio, isPrivacyActive, true)}
          </span>
        </div>
      </div>

      {/* Segmented Distribution Bar */}
      <div className="h-3.5 w-full bg-slate-900 rounded-lg overflow-hidden flex shadow-inner">
        {percentages.bank > 0 && (
          <div
            style={{ width: `${percentages.bank}%` }}
            className="bg-sky-500 hover:bg-sky-400 transition-all"
            title={`Bank Accounts: ${percentages.bank.toFixed(1)}%`}
          />
        )}
        {percentages.savings > 0 && (
          <div
            style={{ width: `${percentages.savings}%` }}
            className="bg-indigo-500 hover:bg-indigo-400 transition-all"
            title={`Dedicated Savings: ${percentages.savings.toFixed(1)}%`}
          />
        )}
        {percentages.cash > 0 && (
          <div
            style={{ width: `${percentages.cash}%` }}
            className="bg-emerald-500 hover:bg-emerald-400 transition-all"
            title={`Physical Cash: ${percentages.cash.toFixed(1)}%`}
          />
        )}
        {percentages.expense > 0 && (
          <div
            style={{ width: `${percentages.expense}%` }}
            className="bg-rose-500 hover:bg-rose-400 transition-all"
            title={`Active Expense Pool: ${percentages.expense.toFixed(1)}%`}
          />
        )}
      </div>

      {/* 4 Allocation Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        {/* 1. Bank Balance Pool */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-sky-400" />
              <span>Bank Reserves</span>
            </span>
            <span className="font-mono text-sky-400 font-semibold">{percentages.bank.toFixed(1)}%</span>
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2 tabular-nums">
            {formatCurrencyValue(bankBalances, isPrivacyActive, true)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            BOI, HDFC, Axis, SBI liquid balances
          </div>
        </div>

        {/* 2. Dedicated Savings Pool */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Vault className="w-3.5 h-3.5 text-indigo-400" />
              <span>Savings Bucket</span>
            </span>
            <span className="font-mono text-indigo-400 font-semibold">{percentages.savings.toFixed(1)}%</span>
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2 tabular-nums">
            {formatCurrencyValue(savingsPool, isPrivacyActive, true)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Emergency & strategic growth fund
          </div>
        </div>

        {/* 3. Physical Cash in Hand */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cash in Hand</span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{percentages.cash.toFixed(1)}%</span>
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2 tabular-nums">
            {formatCurrencyValue(cashInHand, isPrivacyActive, true)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Available paper currency on hand
          </div>
        </div>

        {/* 4. Active Expense Pool */}
        <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
              <span>Expense Burn</span>
            </span>
            <span className="font-mono text-rose-400 font-semibold">{percentages.expense.toFixed(1)}%</span>
          </div>
          <div className="text-lg font-bold font-mono text-white mt-2 tabular-nums">
            {formatCurrencyValue(expensePool, isPrivacyActive, true)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Outflow consumption during period
          </div>
        </div>
      </div>
    </div>
  );
};
