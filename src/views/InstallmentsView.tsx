import React, { useState } from 'react';
import { 
  Clock, Plus, Filter, Search, AlertCircle, Edit, CreditCard, 
  CheckCircle, ShieldAlert, X 
} from 'lucide-react';
import { Installment, Student, ManualInstallmentInput } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { 
  formatCurrency, DueBadge, InstallmentStatusBadge 
} from '../components/StatusBadges';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

export const InstallmentsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredInstallments = installments.filter((i) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      (i.student_name && i.student_name.toLowerCase().includes(q)) ||
      (i.student_code && i.student_code.toLowerCase().includes(q)) ||
      i.month.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesOnlyDues = !onlyDues || i.due_amount > 0;

    return matchesSearch && matchesStatus && matchesOnlyDues;
  });

  const totalDuesSum = filteredInstallments.reduce((sum, i) => sum + i.due_amount, 0);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="space-y-5">
      {/* Top Banner Alert on Due Rules */}
      <div className="rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-start gap-3">
         
         
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => setOnlyDues(!onlyDues)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
              onlyDues
                ? 'bg-red-700 text-white border-red-800'
                : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
            }`}
          >
            {onlyDues ? 'Showing Dues Only' : 'Filter Dues Only'}
          </button>

          {/* Admin Only: Manual Installment (Rule 14) */}
          {isAdmin && (
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              + Manual Installment
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, ID, or month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Installments Schedule ({filteredInstallments.length} rows)
          </span>
          <span className="text-red-700 font-bold font-mono">
            Total Outstanding Dues: {formatCurrency(totalDuesSum)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Student</th>
                <th className="py-3 px-3.5">Installment</th>
                <th className="py-3 px-3.5">Month</th>
                <th className="py-3 px-3.5">Due Date</th>
                <th className="py-3 px-3.5 text-right">Installment Amount</th>
                <th className="py-3 px-3.5 text-right">Amount Paid</th>
                <th className="py-3 px-3.5 text-right">Due Amount (RED)</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInstallments.map((inst) => {
                const hasDue = inst.due_amount > 0;
                return (
                  <tr 
                    key={inst.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      hasDue && inst.status === 'overdue' ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div>{inst.student_name}</div>
                      <div className="text-[10px] font-mono text-slate-400 font-normal">
                        {inst.student_code} · {inst.course_name}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 text-slate-700">
                      <span className="font-semibold">{inst.name || `Installment ${inst.installment_number}`}</span>
                      {inst.is_manual && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded ml-1 font-bold">
                          Manual
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-slate-800 font-medium">
                      {inst.month}
                    </td>

                    <td className="py-3 px-3.5 text-slate-500 font-mono">
                      {inst.due_date}
                    </td>

                    <td className="py-3 px-3.5 text-right font-bold text-slate-900 tabular-nums">
                      {formatCurrency(inst.installment_amount)}
                    </td>

                    <td className="py-3 px-3.5 text-right font-medium text-emerald-700 tabular-nums">
                      {formatCurrency(inst.paid_amount)}
                    </td>

                    {/* RED DUE BADGE (SECTION 11 & 33) */}
                    <td className="py-3 px-3.5 text-right tabular-nums">
                      {hasDue ? (
                        <DueBadge amount={inst.due_amount} />
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                      {inst.pay_now_amount && inst.pay_now_amount > inst.paid_amount && (
                        <div className="text-[10px] text-amber-700 font-semibold">
                          Pays now: {formatCurrency(inst.pay_now_amount - inst.paid_amount)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <InstallmentStatusBadge status={inst.status} />
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <button
                        onClick={() => handleOpenPayForStudent(inst.student_id)}
                        className="px-2.5 py-1 text-xs font-semibold text-red-700 hover:text-white hover:bg-red-700 bg-red-50 border border-red-200 rounded transition-colors"
                      >
                        Payment Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  + Add Manual Installment
                </h3>
                <span className="text-xs text-amber-400">
                  Administrator Privilege Only
                </span>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-1 text-slate-400 hover:text-white">
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
                  className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
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
                  value={manualForm.amount}
                  onChange={(e) => setManualForm({ ...manualForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                />
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
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
