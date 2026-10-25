import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrencyValue } from '../utils/formatters';
import { Calendar } from 'lucide-react';

export const MonthlyCashFlowTable: React.FC = () => {
  const { monthlySummaries, isPrivacyActive, filters, setFilterProp } = useFinance();

  const totalYearIncome = monthlySummaries.reduce((sum, m) => sum + m.income, 0);
  const totalYearExpense = monthlySummaries.reduce((sum, m) => sum + m.expense, 0);
  const totalYearSavings = monthlySummaries.reduce((sum, m) => sum + m.savings, 0);
  const overallSavingsRate = totalYearIncome > 0 ? (totalYearSavings / totalYearIncome) * 100 : 0;
  const lastMonthRunningBalance = monthlySummaries[monthlySummaries.length - 1]?.runningBalance || 0;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>12-Month Cash Flow & Balance Consolidation</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Rolling monthly ledger rollup for {filters.year} with savings rate and cumulative balance
          </p>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Click row to filter
        </span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-700/80">
              <th className="py-2.5 px-3">Month</th>
              <th className="py-2.5 px-3 text-right">Income (₹)</th>
              <th className="py-2.5 px-3 text-right">Expense (₹)</th>
              <th className="py-2.5 px-3 text-right">Savings (₹)</th>
              <th className="py-2.5 px-3 text-right">Rate</th>
              <th className="py-2.5 px-3 text-right">Cumulative (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40 text-slate-200">
            {monthlySummaries.map(item => {
              const isSelected = filters.month === item.month;
              const hasActivity = item.income > 0 || item.expense > 0 || item.savings > 0;

              return (
                <tr
                  key={item.month}
                  onClick={() => setFilterProp('month', item.month)}
                  className={`hover:bg-slate-700/40 transition-colors cursor-pointer ${
                    isSelected ? 'bg-emerald-500/10 font-medium' : ''
                  }`}
                >
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className={isSelected ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                      {item.monthName}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-400/90">
                    {hasActivity ? formatCurrencyValue(item.income, isPrivacyActive, true) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-rose-400/90">
                    {hasActivity ? formatCurrencyValue(item.expense, isPrivacyActive, true) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-indigo-300">
                    {hasActivity && item.savings > 0 ? formatCurrencyValue(item.savings, isPrivacyActive, true) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-cyan-300">
                    {hasActivity && item.income > 0 ? `${item.savingsRate.toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-100 font-medium">
                    {formatCurrencyValue(item.runningBalance, isPrivacyActive, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900/80 font-semibold border-t-2 border-slate-700 text-slate-100">
              <td className="py-2.5 px-3">Total / EOY</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">
                {formatCurrencyValue(totalYearIncome, isPrivacyActive, true)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-400">
                {formatCurrencyValue(totalYearExpense, isPrivacyActive, true)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-indigo-300">
                {formatCurrencyValue(totalYearSavings, isPrivacyActive, true)}
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-cyan-300">
                {overallSavingsRate.toFixed(1)}%
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-300">
                {formatCurrencyValue(lastMonthRunningBalance, isPrivacyActive, true)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
