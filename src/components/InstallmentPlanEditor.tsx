import React from 'react';
import { Plus, Trash2, RotateCcw, CheckCircle2, AlertCircle, CornerDownRight, Info } from 'lucide-react';
import { formatCurrency } from './StatusBadges';
import { MAX_INSTALLMENTS } from '../services/db';
import {
  PlanRow, rowTotalPaise, planTotalPaise, unallocatedPaise, rowUnallocatedPaise,
  setRowAmount, setRowDate, setSubAmount, setSubDate, addSub, removeSub, canAddSub,
  addManual, canAddManual, removeRow, rowLabel
} from '../lib/installmentPlan';

interface Props {
  plan: PlanRow[];
  onChange: (plan: PlanRow[]) => void;
  fee: number;
  count: number;
  onCountChange: (n: number) => void;
  onReset: () => void;
}

const inputCls =
  'w-full h-9 px-2.5 border border-slate-300 rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600';

export const InstallmentPlanEditor: React.FC<Props> = ({ plan, onChange, fee, count, onCountChange, onReset }) => {
  const total = planTotalPaise(plan) / 100;
  const open = unallocatedPaise(plan, fee) / 100;
  const tallies = Math.abs(open) < 0.005;

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Number of Installments *</label>
          <select
            value={count}
            onChange={(e) => onCountChange(Number(e.target.value))}
            className={`${inputCls} font-semibold text-slate-900`}
          >
            {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n === 1 ? '1 – Full payment' : `${n} Installments`}</option>
            ))}
          </select>
        </div>
        <div className="px-3 h-[58px] rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between self-end">
          <span className="text-slate-600 font-medium">Course Fee</span>
          <span className="text-base font-extrabold text-blue-700 tabular-nums">{formatCurrency(fee)}</span>
        </div>
      </div>

     

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Installment</th>
              <th className="px-3 py-2.5 font-semibold w-40">Due Date</th>
              <th className="px-3 py-2.5 font-semibold w-36 text-right">Amount (₹)</th>
              <th className="px-2 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {plan.map((row, idx) => {
              const label = rowLabel(plan, idx);
              const rowOpen = rowUnallocatedPaise(row) / 100;
              const isAuto = row.kind === 'auto';
              const prevAutoDate = plan.slice(0, idx).filter(r => r.kind === 'auto').map(r => r.due_date).pop();
              return (
                <React.Fragment key={idx}>
                  {/* main row */}
                  <tr className="border-t border-slate-200 bg-white">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900">{label}</div>
                      <div className="text-[10px] text-slate-500">
                        {isAuto ? `Planned ${formatCurrency(row.target / 100)}` : 'Manual · covers unplanned balance'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.due_date}
                        min={isAuto ? prevAutoDate : undefined}
                        onChange={(e) => onChange(setRowDate(plan, idx, e.target.value))}
                        className={inputCls}
                        aria-label={`${label} due date`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={row.amount}
                        onChange={(e) => onChange(setRowAmount(plan, idx, e.target.value))}
                        className={`${inputCls} text-right font-bold tabular-nums`}
                        aria-label={`${label} amount`}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!isAuto && (
                        <button
                          type="button"
                          onClick={() => onChange(removeRow(plan, idx))}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Remove manual installment"
                          aria-label={`Remove ${label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* sub-installments */}
                  {row.subs.map((sub, k) => (
                    <tr key={`${idx}-${k}`} className="bg-blue-50/40">
                      <td className="pl-6 pr-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold text-slate-800">Installment {idx + 1}.{k + 1}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Sub</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="date"
                          value={sub.due_date}
                          min={row.due_date}
                          onChange={(e) => onChange(setSubDate(plan, idx, k, e.target.value))}
                          className={inputCls}
                          aria-label={`Installment ${idx + 1}.${k + 1} due date`}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={sub.amount}
                          onChange={(e) => onChange(setSubAmount(plan, idx, k, e.target.value))}
                          className={`${inputCls} text-right font-semibold tabular-nums`}
                          aria-label={`Installment ${idx + 1}.${k + 1} amount`}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => onChange(removeSub(plan, idx, k))}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Remove sub-installment"
                          aria-label={`Remove Installment ${idx + 1}.${k + 1}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* row footer: add sub + row tally */}
                  {isAuto && (
                    <tr className={row.subs.length ? 'bg-blue-50/40' : 'bg-white'}>
                      <td colSpan={4} className="pl-6 pr-3 pb-2 pt-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onChange(addSub(plan, idx))}
                            disabled={!canAddSub(row)}
                            title={canAddSub(row) ? '' : 'Lower the installment amount first to create a sub-installment'}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 disabled:text-slate-300 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {row.subs.length ? 'Split into another sub-installment' : 'Add sub-installment'}
                          </button>
                          {row.subs.length > 0 && (
                            <span className={`text-[11px] font-semibold tabular-nums ${Math.abs(rowOpen) < 0.005 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {label} total {formatCurrency(rowTotalPaise(row) / 100)}
                              {Math.abs(rowOpen) < 0.005
                                ? ' ✓'
                                : rowOpen > 0
                                  ? ` · ${formatCurrency(rowOpen)} not covered`
                                  : ` · ${formatCurrency(-rowOpen)} above planned`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
              <td colSpan={2} className="px-3 py-2.5 text-right text-slate-700">Total of all installments</td>
              <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tallies ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(total)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {tallies ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Total matches the course fee
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold">
            <AlertCircle className="w-4 h-4" />
            {open > 0 ? `${formatCurrency(open)} not planned yet` : `${formatCurrency(-open)} more than the course fee`}
          </span>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange(addManual(plan, fee))}
            disabled={!canAddManual(plan, fee)}
            title={canAddManual(plan, fee) ? '' : 'Nothing left to plan – the total already equals the course fee'}
            className="inline-flex items-center gap-1 px-3 h-8 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> Add manual installment
            {open > 0 && <span className="tabular-nums">({formatCurrency(open)})</span>}
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 px-3 h-8 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset equal split
          </button>
        </div>
      </div>
    </div>
  );
};

