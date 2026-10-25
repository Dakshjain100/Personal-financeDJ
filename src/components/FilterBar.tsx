import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { MONTH_NAMES, formatDisplayDate } from '../utils/formatters';
import { Eye, EyeOff, RotateCcw, Calendar, Layers } from 'lucide-react';

interface FilterBarProps {
  onOpenResetModal?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ onOpenResetModal }) => {
  const {
    filters,
    setFilterProp,
    isPrivacyActive,
    setIsPrivacyActive,
    selectedDateCutoff,
  } = useFinance();

  const currentYear = filters.year;

  return (
    <div className="bg-slate-900/60 border-b border-slate-800 py-3.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Dynamic Time Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.year}
              onChange={e => setFilterProp('year', Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value={2026}>2026 (Current)</option>
              <option value={2025}>2025</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <select
              value={filters.month === 'ALL' ? 'ALL' : filters.month}
              onChange={e => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setFilterProp('month', val);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="ALL">All Months (YTD)</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Day Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <select
              value={filters.day === 'ALL' ? 'ALL' : filters.day}
              onChange={e => {
                const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                setFilterProp('day', val);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="ALL">All Days</option>
              <option value={25}>Day 25 (Today)</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>
                  Day {d}
                </option>
              ))}
            </select>
          </div>

          {/* Active Period Label */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 pl-2 border-l border-slate-800">
            <span>Cutoff:</span>
            <span className="text-slate-200 font-mono font-medium">
              {formatDisplayDate(selectedDateCutoff)}
            </span>
          </div>
        </div>

        {/* Right Side: Balance Mode & Privacy Toggle */}
        <div className="flex items-center gap-3">
          {/* Balance Scope Selector */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setFilterProp('balanceScope', 'ALL')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filters.balanceScope === 'ALL'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="All Liquid accounts (Banks + Cash)"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterProp('balanceScope', 'BOI_CASH_AXIS_SBI')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filters.balanceScope === 'BOI_CASH_AXIS_SBI'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Balance (BOI + Cash + Axis + SBI)"
            >
              Balance
            </button>
          </div>

          {/* Balance Mode Segmented Selector */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setFilterProp('balanceMode', 'TILL_DATE')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filters.balanceMode === 'TILL_DATE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Cumulative sum of accounts up to selected date cutoff"
            >
              Cumulative (Till Date)
            </button>
            <button
              type="button"
              onClick={() => setFilterProp('balanceMode', 'DAY_NET')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filters.balanceMode === 'DAY_NET'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Net sum of inflows minus outflows on selected date"
            >
              Day Net Mode
            </button>
          </div>

          {/* Privacy Toggle */}
          <button
            type="button"
            onClick={() => setIsPrivacyActive(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              isPrivacyActive
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle sensitive balance visibility"
          >
            {isPrivacyActive ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Hidden</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Privacy</span>
              </>
            )}
          </button>

          {/* Reset App Data Button (Requires Security PIN / Code) */}
          <button
            type="button"
            onClick={onOpenResetModal}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition-colors cursor-pointer"
            title="Wipe & Reset Application Data (Requires Security Code)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
