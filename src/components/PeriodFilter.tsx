import React from 'react';

import { CalendarDays, CalendarRange } from 'lucide-react';

/**
 * Period picker used on the dashboard.
 *  - All time
 *  - Month  : native month picker (calendar)            -> 1st..last day of that month
 *  - Year   : year dropdown                              -> 1 Jan..31 Dec
 *  - Custom : From / To native date pickers (calendar)   -> any date range
 * Emits an inclusive { from, to } range as 'YYYY-MM-DD' strings ('' = open).
 */
export type PeriodMode = 'all' | 'month' | 'year' | 'custom';

export interface PeriodValue {
  mode: PeriodMode;
  month: string; // 'YYYY-MM'
  year: number;
  from: string;  // 'YYYY-MM-DD'
  to: string;    // 'YYYY-MM-DD'
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const defaultPeriod = (): PeriodValue => {
  const now = new Date();
  return {
    mode: 'all',
    month: `${now.getFullYear()}-${pad(now.getMonth() + 1)}`,
    year: now.getFullYear(),
    from: '',
    to: ''
  };
};

/** Turns the picker state into an inclusive date range */
export const periodRange = (p: PeriodValue): { from: string; to: string } => {
  if (p.mode === 'month' && /^\d{4}-\d{2}$/.test(p.month)) {
    const [y, m] = p.month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return { from: `${p.month}-01`, to: `${p.month}-${pad(last)}` };
  }
  if (p.mode === 'year' && p.year) return { from: `${p.year}-01-01`, to: `${p.year}-12-31` };
  if (p.mode === 'custom') {
    // swap if entered the wrong way round
    if (p.from && p.to && p.from > p.to) return { from: p.to, to: p.from };
    return { from: p.from, to: p.to };
  }
  return { from: '', to: '' };
};

const fmt = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const periodLabel = (p: PeriodValue): string => {
  if (p.mode === 'month' && /^\d{4}-\d{2}$/.test(p.month)) {
    const [y, m] = p.month.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }
  if (p.mode === 'year') return `Year ${p.year}`;
  if (p.mode === 'custom') {
    const { from, to } = periodRange(p);
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `From ${fmt(from)}`;
    if (to) return `Up to ${fmt(to)}`;
  }
  return 'All time';
};

const inputCls =
  'h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

export const PeriodFilter: React.FC<{
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
  years: number[];
}> = ({ value, onChange, years }) => {
  const set = (patch: Partial<PeriodValue>) => onChange({ ...value, ...patch });
  const yearOptions = Array.from(new Set([...years, new Date().getFullYear()])).sort((a, b) => b - a);

   const modes: { id: PeriodMode; label: string; icon: React.ElementType }[] = [
    { id: 'custom', label: 'Start Date - End Date', icon: CalendarRange }
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200" role="tablist" aria-label="Period">
        {modes.map(m => {
          const Icon = m.icon;
          const active = value.mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={m.label}
              title={m.label}
              // click again to clear the range and go back to "All time"
              onClick={() => set({ mode: active ? 'all' : m.id })}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors ${
                active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      

      {value.mode === 'custom' && (
        <div className="inline-flex items-center gap-1.5">
          <label className="relative inline-flex items-center">
            <span className="sr-only">From date</span>
            <input type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} className={inputCls} aria-label="From date" />
          </label>
          <span className="text-slate-400 text-xs">to</span>
          <label className="relative inline-flex items-center">
            <span className="sr-only">To date</span>
            <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} className={inputCls} aria-label="To date" />
          </label>
        </div>
      )}
    </div>
  );
};
