import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Search, X, Download, ChevronsDownUp, ChevronsUpDown,
  BookOpen, UserCheck, ListChecks, AlertTriangle, CalendarClock, CornerDownRight, Inbox
} from 'lucide-react';
import { db } from '../services/db';
import { Student, Installment, Payment } from '../types/crm';
import {
  formatCurrency, InstallmentStatusBadge, StudentPaymentStatusBadge
} from '../components/StatusBadges';

/**
 * Department Report
 *  - pick a department (or all) -> every student in it with course, trainer, fee, paid, outstanding
 *  - click a row (or the ▼ button) to expand it: the row scrolls into view and shows that
 *    student's installments + payment history; click ▲ to collapse
 *  - any number of rows can be open; Expand all / Collapse all; CSV export
 */

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const isSub = (i: Installment) => !!i.parent_installment_id || (i.sub_number || 0) > 0;

interface Row {
  student: Student;
  installments: Installment[];
  payments: Payment[];
  fee: number;
  paid: number;
  due: number;
  overdueCount: number;
  paidCount: number;
  lastPayment?: string;
}

export const Departmentreportsview: React.FC = () => {
  const departments = db.getDepartments();
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id || 'all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const department = departments.find(d => d.id === departmentId);

  // one row per unique student in the department, with their money totals
  const rows: Row[] = useMemo(() => {
    const seen = new Set<string>();
    return db
      .getStudents()
      .filter(s => departmentId === 'all' || s.department_id === departmentId)
      .filter(s => (seen.has(s.id) ? false : (seen.add(s.id), true)))
      .map(student => {
        const installments = [...db.getInstallments(student.id)].sort(
          (a, b) => a.installment_number - b.installment_number || (a.sub_number || 0) - (b.sub_number || 0)
        );
        const payments = [...db.getPayments(student.id)].sort(
          (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );
        const fee = installments.length
          ? installments.reduce((t, i) => t + i.installment_amount, 0)
          : student.total_course_amount;
        const paid = payments.length ? payments.reduce((t, p) => t + p.amount, 0) : student.total_paid;
        return {
          student,
          installments,
          payments,
          fee,
          paid,
          due: Math.max(0, Math.round((fee - paid) * 100) / 100),
          overdueCount: installments.filter(i => i.status === 'overdue' && i.due_amount > 0).length,
          paidCount: installments.filter(i => i.due_amount <= 0).length,
          lastPayment: payments[0]?.payment_date
        };
      })
      .sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));
  }, [departmentId]);

  const visible = rows.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const s = r.student;
    return `${s.full_name} ${s.student_code} ${s.phone} ${s.course_name} ${s.trainer_name}`.toLowerCase().includes(q);
  });

  const totals = visible.reduce(
    (t, r) => ({ fee: t.fee + r.fee, paid: t.paid + r.paid, due: t.due + r.due, closed: t.closed + (r.due <= 0 ? 1 : 0) }),
    { fee: 0, paid: 0, due: 0, closed: 0 }
  );

  const toggle = (id: string) => {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // scroll the opened student to the top of the view once the panel has rendered
        requestAnimationFrame(() =>
          rowRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        );
      }
      return next;
    });
  };

  const allOpen = visible.length > 0 && visible.every(r => open.has(r.student.id));
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(visible.map(r => r.student.id)));

  const exportCsv = () => {
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      ['Student ID', 'Student', 'Phone', 'Course', 'Trainer', 'Installments', 'Paid Installments', 'Total Fee', 'Paid', 'Outstanding', 'Status', 'Last Payment'].join(','),
      ...visible.map(r =>
        [r.student.student_code, r.student.full_name, r.student.phone, r.student.course_name, r.student.trainer_name,
          r.installments.length, r.paidCount, r.fee, r.paid, r.due, r.due <= 0 ? 'Closed' : 'Open', fmtDate(r.lastPayment)]
          .map(esc).join(',')
      )
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `department-report-${(department?.code || 'all').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Department Report</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Every student in the department with fees, payments and dues. Click a student to see their payment details.
            </p>
          </div>
          <select
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setOpen(new Set()); }}
            className="h-9 px-3 min-w-[220px] bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
            aria-label="Department"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
          </select>
        </div>

        {/* department totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-slate-100 text-xs">
          {[
            { label: 'Students', value: String(visible.length), tone: 'text-slate-900' },
            { label: 'Total Fees', value: formatCurrency(totals.fee), tone: 'text-slate-900' },
            { label: 'Paid', value: formatCurrency(totals.paid), tone: 'text-emerald-700' },
            { label: 'Outstanding', value: formatCurrency(totals.due), tone: 'text-red-600' },
            { label: 'Fully Paid (Closed)', value: `${totals.closed} / ${visible.length}`, tone: 'text-blue-700' }
          ].map(t => (
            <div key={t.label} className="px-5 py-3">
              <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">{t.label}</div>
              <div className={`mt-0.5 text-base font-bold tabular-nums ${t.tone}`}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Student list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-200">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student, ID, course, trainer…"
              className="w-full h-9 pl-9 pr-8 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
              aria-label="Search students"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label="Clear search">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="sm:ml-auto flex gap-2">
            <button
              onClick={toggleAll}
              disabled={visible.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              {allOpen ? <ChevronsDownUp className="w-3.5 h-3.5" /> : <ChevronsUpDown className="w-3.5 h-3.5" />}
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
            <button
              onClick={exportCsv}
              disabled={visible.length === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3 text-left font-semibold">Student</th>
                <th className="px-3 py-3 text-left font-semibold">Course Enrolled</th>
                <th className="px-3 py-3 text-left font-semibold">Trainer</th>
                <th className="px-3 py-3 text-center font-semibold">Installments</th>
                <th className="px-3 py-3 text-right font-semibold">Total Fee</th>
                <th className="px-3 py-3 text-right font-semibold">Paid</th>
                <th className="px-3 py-3 text-right font-semibold">Outstanding</th>
                <th className="px-3 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    {query ? `No students match “${query}”.` : 'No students in this department yet.'}
                  </td>
                </tr>
              )}

              {visible.map(r => {
                const s = r.student;
                const isOpen = open.has(s.id);
                return (
                  <React.Fragment key={s.id}>
                    {/* summary row */}
                    <tr
                      ref={el => { rowRefs.current[s.id] = el; }}
                      onClick={() => toggle(s.id)}
                      className={`scroll-mt-20 border-b border-slate-100 cursor-pointer transition-colors ${isOpen ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                      aria-expanded={isOpen}
                    >
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggle(s.id); }}
                          className={`h-7 w-7 inline-flex items-center justify-center rounded-md border transition-colors ${
                            isOpen ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-500 hover:text-blue-700 hover:border-blue-300'
                          }`}
                          aria-label={isOpen ? `Collapse ${s.full_name}` : `Expand ${s.full_name}`}
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900">{s.full_name}</div>
                        <div className="text-[10px] text-slate-400"><span className="font-mono">{s.student_code}</span> · {s.phone}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">{s.course_name}</td>
                      <td className="px-3 py-3 text-slate-700">{s.trainer_name || '—'}</td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        <span className="font-semibold text-slate-800">{r.paidCount}</span>
                        <span className="text-slate-400"> / {r.installments.length} paid</span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-900">{formatCurrency(r.fee)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-700">{formatCurrency(r.paid)}</td>
                      <td className={`px-3 py-3 text-right tabular-nums font-bold ${r.due > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {formatCurrency(r.due)}
                      </td>
                      <td className="px-3 py-3">
                        {r.due <= 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            Closed
                          </span>
                        ) : (
                          <StudentPaymentStatusBadge status={s.payment_status} />
                        )}
                      </td>
                    </tr>

                    {/* expandable details */}
                    <tr className={isOpen ? 'border-b-2 border-blue-200' : ''}>
                      <td colSpan={9} className="p-0">
                        <div
                          className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                        >
                          <div className="overflow-hidden">
                            {isOpen && <StudentDetails row={r} onClose={() => toggle(s.id)} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ---------- expanded panel: one student's payment details ---------- */

const StudentDetails: React.FC<{ row: Row; onClose: () => void }> = ({ row, onClose }) => {
  const { student: s, installments, payments } = row;

  const facts = [
    { icon: BookOpen, label: 'Course Enrolled', value: s.course_name },
    { icon: UserCheck, label: 'Trainer Assigned', value: s.trainer_name || '—' },
    { icon: ListChecks, label: 'Installments', value: `${installments.length} (${row.paidCount} paid)` },
    { icon: AlertTriangle, label: 'Due Amount', value: formatCurrency(row.due), danger: row.due > 0 },
    { icon: CalendarClock, label: 'Last Payment', value: fmtDate(row.lastPayment) }
  ];

  return (
    <div className="bg-slate-50/80 px-5 py-4 space-y-4 whitespace-normal">
      {/* quick facts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {facts.map(f => (
          <div key={f.label} className="bg-white rounded-lg border border-slate-200 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-slate-400">
              <f.icon className="w-3.5 h-3.5" /> {f.label}
            </div>
            <div className={`mt-1 text-xs font-bold ${f.danger ? 'text-red-600' : 'text-slate-900'}`}>{f.value}</div>
          </div>
        ))}
      </div>

      {row.overdueCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 font-semibold">
          <AlertTriangle className="w-4 h-4" /> {row.overdueCount} installment(s) overdue
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
        {/* installments */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-800">Installments</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Installment</th>
                  <th className="px-3 py-2 text-left font-semibold">Due Date</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="px-3 py-2 text-right font-semibold">Paid</th>
                  <th className="px-3 py-2 text-right font-semibold">Balance</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {installments.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-slate-400">No installments.</td></tr>
                )}
                {installments.map(i => (
                  <tr key={i.id} className={`border-t border-slate-100 ${isSub(i) ? 'bg-blue-50/40' : ''}`}>
                    <td className={`py-2 ${isSub(i) ? 'pl-6 pr-3' : 'px-3'}`}>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        {isSub(i) && <CornerDownRight className="w-3 h-3 text-blue-500" />}
                        {i.name || `Installment ${i.installment_number}`}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">{i.due_date}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">{formatCurrency(i.installment_amount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-700">{formatCurrency(i.paid_amount)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${i.due_amount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {formatCurrency(i.due_amount)}
                    </td>
                    <td className="px-3 py-2"><InstallmentStatusBadge status={i.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* payments */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">Payment History</span>
            <span className="text-slate-500">{payments.length} payment(s) · <b className="text-emerald-700">{formatCurrency(row.paid)}</b></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Receipt</th>
                  <th className="px-3 py-2 text-left font-semibold">For</th>
                  <th className="px-3 py-2 text-left font-semibold">Method</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400">No payments yet.</td></tr>
                )}
                {payments.map(p => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 tabular-nums text-slate-600">{fmtDate(p.payment_date)}</td>
                    <td className="px-3 py-2 font-mono text-slate-800">{p.receipt_number}</td>
                    <td className="px-3 py-2 text-slate-700">{p.installment_month}</td>
                    <td className="px-3 py-2">
                      <span className="uppercase text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{p.payment_method}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 h-8 px-3 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50"
        >
          <ChevronUp className="w-3.5 h-3.5" /> Close details
        </button>
      </div>
    </div>
  );
};
