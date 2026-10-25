import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatCurrencyValue } from '../utils/formatters';
import { PieChart, ArrowUpRight } from 'lucide-react';

interface ExpenseCategoryBreakdownProps {
  onSelectCategory?: (categoryId: string) => void;
}

export const ExpenseCategoryBreakdown: React.FC<ExpenseCategoryBreakdownProps> = ({ onSelectCategory }) => {
  const { categoryExpenseRollups, kpis, isPrivacyActive, filters } = useFinance();

  const isSpecificMonth = filters.month !== 'ALL';

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700/80 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <span>Expense Category Breakdown & Burn Rate</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ranked category expenses, allocation share, and {isSpecificMonth ? 'daily' : 'monthly'} burn velocity
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total: <span className="text-rose-400 font-semibold">{formatCurrencyValue(kpis.totalExpense, isPrivacyActive, true)}</span>
        </div>
      </div>

      <div className="p-4 space-y-3.5 overflow-y-auto max-h-[520px]">
        {categoryExpenseRollups.length === 0 || kpis.totalExpense === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No expenses recorded for the active period.
          </div>
        ) : (
          categoryExpenseRollups
            .filter(cat => cat.totalExpense > 0)
            .map((cat, index) => {
              const burnRateLabel = isSpecificMonth
                ? `${formatCurrencyValue(cat.dailyAverage, isPrivacyActive, true)}/day`
                : `${formatCurrencyValue(cat.monthlyAverage, isPrivacyActive, true)}/mo`;

              return (
                <div
                  key={cat.categoryId}
                  onClick={() => onSelectCategory && onSelectCategory(cat.categoryId)}
                  className="group cursor-pointer hover:bg-slate-700/20 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono w-4">{index + 1}.</span>
                      <span className="font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                        {cat.categoryName}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({cat.transactionCount} tx)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400">
                        {burnRateLabel}
                      </span>
                      <span className="font-mono font-bold text-slate-100 tabular-nums">
                        {formatCurrencyValue(cat.totalExpense, isPrivacyActive, true)}
                      </span>
                      <span className="text-[11px] font-mono font-medium text-emerald-400 w-11 text-right">
                        {cat.percentageOfTotal.toFixed(1)}%
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Allocation Bar */}
                  <div className="w-full bg-slate-700/60 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, cat.percentageOfTotal))}%` }}
                    />
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};
