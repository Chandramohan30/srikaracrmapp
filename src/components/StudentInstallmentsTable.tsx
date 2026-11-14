import React from 'react';
import { CreditCard, CheckCircle, CornerDownRight, Lock } from 'lucide-react';
import { Installment } from '../types/crm';
import { formatCurrency, InstallmentStatusBadge } from './StatusBadges';

/**
 * Student's own installment plan (student dashboard + payments page).
 * Sub-installments (1.1, 1.2 …) are shown indented under their installment, with its group total.
 */
export const StudentInstallmentsTable: React.FC<{
  installments: Installment[];
  onPay?: (installmentId: string) => void;
}> = ({ installments, onPay }) => {
  const sorted = [...installments].sort(
    (a, b) => a.installment_number - b.installment_number || (a.sub_number || 0) - (b.sub_number || 0)
  );
  const isSub = (i: Installment) => !!i.parent_installment_id || (i.sub_number || 0) > 0;
  const groupTotal = (n: number) =>
    sorted.filter(i => i.installment_number === n).reduce((t, i) => t + i.installment_amount, 0);
  const hasSubs = (n: number) => sorted.some(i => i.installment_number === n && isSub(i));
  const total = sorted.reduce((t, i) => t + i.installment_amount, 0);
  const due = sorted.reduce((t, i) => t + i.due_amount, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900">My Installment Plan</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Amounts and dates are set by the academy. You can pay any installment.
          </p>
        </div>
        <div className="text-[11px] text-slate-500">
          Total <b className="text-slate-800 tabular-nums">{formatCurrency(total)}</b> · Due{' '}
          <b className={`tabular-nums ${due > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatCurrency(due)}</b>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Installment</th>
              <th className="px-4 py-3 text-left font-semibold">Due Date</th>
              <th className="px-4 py-3 text-right font-semibold">Amount</th>
              <th className="px-4 py-3 text-right font-semibold">Paid</th>
              <th className="px-4 py-3 text-right font-semibold">Balance</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              {onPay && <th className="px-4 py-3 text-right font-semibold">Pay</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={onPay ? 7 : 6} className="py-10 text-center text-slate-400">No installments yet.</td></tr>
            )}
            {sorted.map((inst, idx) => {
              const sub = isSub(inst);
              const nextIsSameGroup = sorted[idx + 1]?.installment_number === inst.installment_number;
              const showGroupTotal = hasSubs(inst.installment_number) && !nextIsSameGroup;
              return (
                <React.Fragment key={inst.id}>
                  <tr className={`border-b border-slate-100 ${sub ? 'bg-blue-50/40' : ''}`}>
                    <td className={`py-2.5 ${sub ? 'pl-8 pr-4' : 'px-4'}`}>
                      <div className="flex items-center gap-1.5">
                        {sub && <CornerDownRight className="w-3.5 h-3.5 text-blue-500" />}
                        <span className={`font-semibold ${sub ? 'text-slate-700' : 'text-slate-900'}`}>
                          {inst.name || `Installment ${inst.installment_number}`}
                        </span>
                        {sub && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Sub</span>}
                        {inst.is_manual && !sub && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">Manual</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{inst.due_date}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">{formatCurrency(inst.installment_amount)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{formatCurrency(inst.paid_amount)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${inst.due_amount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {formatCurrency(inst.due_amount)}
                    </td>
                    <td className="px-4 py-2.5"><InstallmentStatusBadge status={inst.status} /></td>
                    {onPay && (
                      <td className="px-4 py-2 text-right">
                        {inst.due_amount > 0 ? (
                          <button
                            onClick={() => onPay(inst.id)}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Pay {formatCurrency(inst.due_amount)}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Cleared
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                  {showGroupTotal && (
                    <tr className="bg-blue-50/40 border-b border-slate-200">
                      <td colSpan={2} className="pl-8 pr-4 py-1.5 text-[11px] text-slate-500">
                        Installment {inst.installment_number} total (incl. sub-installments)
                      </td>
                      <td className="px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-slate-700">
                        {formatCurrency(groupTotal(inst.installment_number))}
                      </td>
                      <td colSpan={onPay ? 4 : 3} />
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
