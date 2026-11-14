import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { Installment, Student, ManualInstallmentInput } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, InstallmentStatusBadge } from '../components/StatusBadges';
import { DataTable, Column, IconAction, PrimaryButton, filterSelectCls } from '../components/DataTable';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

export const InstallmentsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyDues, setOnlyDues] = useState(false);

  // Selected student for payment modal
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<Student | null>(null);

  // Admin Manual Installment modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<ManualInstallmentInput>({
    student_id: '',
    amount: 5000,
    month: 'April 2026',
    due_date: '2026-04-10',
    notes: 'Placement prep fee addition'
  });

  const reloadData = () => {
    setInstallments(db.getInstallments());
    const allStudents = db.getStudents();
    setStudents(allStudents);
    if (allStudents.length > 0 && !manualForm.student_id) {
      setManualForm(prev => ({ ...prev, student_id: allStudents[0].id }));
    }
  };

  React.useEffect(() => {
    reloadData();
  }, []);

  const filteredInstallments = installments.filter((i) =>
    (statusFilter === 'all' || i.status === statusFilter) && (!onlyDues || i.due_amount > 0)
  );

  const totalDuesSum = filteredInstallments.reduce((sum, i) => sum + i.due_amount, 0);

  // Manual installments can only cover course fee that is not planned yet
  const courses = db.getCourses();
  const roomFor = (studentId: string) => {
    const std = students.find(x => x.id === studentId);
    if (!std) return 0;
    const fee = courses.find(c => c.id === std.course_id)?.base_price ?? std.total_course_amount;
    const planned = installments.filter(x => x.student_id === studentId).reduce((t, x) => t + x.installment_amount, 0);
    return Math.max(0, Math.round((fee - planned) * 100) / 100);
  };
  const manualRoom = roomFor(manualForm.student_id);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualForm.amount > manualRoom + 0.009) {
      alert(manualRoom > 0
        ? `This student's installments already cover most of the course fee. You can add at most ${formatCurrency(manualRoom)}.`
        : "This student's installments already equal the course fee. Nothing more can be added.");
      return;
    }
    try {
      await db.addManualInstallment(manualForm, currentUser);
      setShowManualModal(false);
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenPayForStudent = (studentId: string) => {
    const std = students.find(s => s.id === studentId);
    if (std) setSelectedStudentForPay(std);
  };

  const isSub = (i: Installment) => !!i.parent_installment_id || (i.sub_number || 0) > 0;

  const columns: Column<Installment>[] = [
    {
      key: 'student_name', header: 'Student',
      render: (i) => (
        <div>
          <div className="font-semibold text-slate-900">{i.student_name}</div>
          <div className="text-[10px] text-slate-400"><span className="font-mono">{i.student_code}</span> · {i.course_name}</div>
        </div>
      )
    },
    {
      key: 'name', header: 'Installment',
      sortValue: (i) => `${i.student_name} ${String(i.installment_number).padStart(3, '0')}.${String(i.sub_number || 0).padStart(3, '0')}`,
      exportValue: (i) => i.name || `Installment ${i.installment_number}`,
      render: (i) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">{i.name || `Installment ${i.installment_number}`}</span>
          {isSub(i) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">Sub</span>}
          {i.is_manual && !isSub(i) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">Manual</span>}
        </div>
      )
    },
    { key: 'due_date', header: 'Due Date', render: (i) => <span className="tabular-nums text-slate-600">{i.due_date}</span> },
    { key: 'installment_amount', header: 'Amount', align: 'right', render: (i) => <span className="tabular-nums font-semibold text-slate-900">{formatCurrency(i.installment_amount)}</span> },
    { key: 'paid_amount', header: 'Paid', align: 'right', render: (i) => <span className="tabular-nums text-emerald-700">{formatCurrency(i.paid_amount)}</span> },
    {
      key: 'due_amount', header: 'Balance', align: 'right',
      render: (i) => (
        <div>
          {i.due_amount > 0
            ? <span className="tabular-nums font-bold text-red-600">{formatCurrency(i.due_amount)}</span>
            : <span className="tabular-nums text-slate-400">₹0</span>}
          {i.pay_now_amount && i.pay_now_amount > i.paid_amount && (
            <div className="text-[10px] text-amber-700 font-semibold">Pays now: {formatCurrency(i.pay_now_amount - i.paid_amount)}</div>
          )}
        </div>
      )
    },
    { key: 'status', header: 'Status', render: (i) => <InstallmentStatusBadge status={i.status} /> }
  ];

  return (
    <div className="space-y-5">
      <DataTable<Installment>
        title="Installments & Dues"
        subtitle={<>{filteredInstallments.length} installment(s) · Outstanding <b className="text-red-600">{formatCurrency(totalDuesSum)}</b> · click a row to open the student's payments</>}
        rows={filteredInstallments}
        columns={columns}
        getRowId={(i) => i.id}
        searchText={(i) => `${i.student_name || ''} ${i.student_code || ''} ${i.course_name || ''} ${i.name || ''} ${i.month} ${i.due_date}`}
        searchPlaceholder="Search student, ID, month…"
        exportFileName="installments"
        initialSort={{ key: 'due_date', dir: 'asc' }}
        onRowClick={(i) => handleOpenPayForStudent(i.student_id)}
        rowClassName={(i) => (i.status === 'overdue' && i.due_amount > 0 ? 'bg-red-50/40' : '')}
        actions={isAdmin ? (
          <PrimaryButton onClick={() => setShowManualModal(true)} icon={<Plus className="w-4 h-4" />}>Manual Installment</PrimaryButton>
        ) : undefined}
        toolbar={
          <>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectCls} aria-label="Status">
              <option value="all">All Statuses</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <label className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-300 rounded-lg bg-white text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={onlyDues} onChange={(e) => setOnlyDues(e.target.checked)} className="accent-blue-600" />
              Only with balance
            </label>
          </>
        }
        rowActions={isAdmin ? (inst) => (
          <IconAction
            title="Delete installment"
            tone="danger"
            onClick={async () => {
              if (!window.confirm(`Delete "${inst.name || 'Installment ' + inst.installment_number}" (${inst.month}) of ₹${inst.installment_amount} for ${inst.student_name}?`)) return;
              try { await db.deleteInstallment(inst.id); reloadData(); } catch (err: any) { alert(err.message); }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </IconAction>
        ) : undefined}
        emptyText="No installments yet."
      />

      {/* --- PAYMENT MODAL TRIGGER --- */}
      {selectedStudentForPay && (
        <StudentPaymentModal
          student={selectedStudentForPay}
          isOpen={!!selectedStudentForPay}
          onClose={() => setSelectedStudentForPay(null)}
          onDataChanged={() => reloadData()}
        />
      )}

      {/* --- ADMIN MANUAL INSTALLMENT MODAL (Rule 14) --- */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Add Manual Installment
                </h3>
                <span className="text-xs text-blue-100">
                  Only for course fee not planned yet
                </span>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-1 text-blue-100 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Student *
                </label>
                <select
                  required
                  value={manualForm.student_id}
                  onChange={(e) => setManualForm({ ...manualForm, student_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_code}) · {s.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Installment Amount (INR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={manualRoom || undefined}
                  value={manualForm.amount}
                  onChange={(e) => setManualForm({ ...manualForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-600"
                />
                <p className={`mt-1 text-[11px] ${manualRoom > 0 ? 'text-slate-500' : 'text-red-600 font-semibold'}`}>
                  {manualRoom > 0
                    ? <>Not yet planned for this student: <b>{formatCurrency(manualRoom)}</b> (installments can't go beyond the course fee).</>
                    : "This student's installments already equal the course fee."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Month Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. April 2026"
                    value={manualForm.month}
                    onChange={(e) => setManualForm({ ...manualForm, month: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualForm.due_date}
                    onChange={(e) => setManualForm({ ...manualForm, due_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason / Notes *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="Notes on manual fee arrangement..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  Save Installment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
