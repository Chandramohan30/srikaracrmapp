import React, { useState } from 'react';
import { 
  CreditCard, Search, Filter, FileText, Download, Eye, 
  CheckCircle, ArrowUpRight, X, Calendar, Lock 
} from 'lucide-react';
import { Payment, Installment, Student } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, InstallmentStatusBadge } from '../components/StatusBadges';
import { ReceiptModal } from '../components/ReceiptModal';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

export const PaymentsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentInstallments, setStudentInstallments] = useState<Installment[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>(undefined);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);

  const reloadData = () => {
    // If student, show only their payments & installments
    if (currentUser.role === 'student') {
      const student = db.getStudents().find(s => s.user_id === currentUser.id || s.id === currentUser.id);
      setCurrentStudent(student || null);
      if (student) {
        setPayments(db.getPayments(student.id));
        setStudentInstallments(db.getInstallments(student.id));
      } else {
        setPayments([]);
        setStudentInstallments([]);
      }
    } else {
      setPayments(db.getPayments());
    }
  };

  React.useEffect(() => {
    reloadData();
  }, [currentUser]);

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      p.student_name.toLowerCase().includes(q) ||
      (p.student_code && p.student_code.toLowerCase().includes(q)) ||
      p.receipt_number.toLowerCase().includes(q) ||
      p.transaction_id.toLowerCase().includes(q);

    const matchesMethod = methodFilter === 'all' || p.payment_method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalCollectedFiltered = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Top Ledger Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Transactions
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {filteredPayments.length} recorded
          </div>
          <span className="text-[10px] text-slate-400">Verified payments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Amount Captured
          </span>
          <div className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
            {formatCurrency(totalCollectedFiltered)}
          </div>
          <span className="text-[10px] text-emerald-600">Reconciled in full</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Payment Mode
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            UPI
          </div>
          <span className="text-[10px] text-slate-400">Verified on upload</span>
        </div>
      </div>

      {/* Student Installments & Make Payment Action */}
      {currentUser.role === 'student' && studentInstallments.length > 0 && currentStudent && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-700" />
                <span>My Course Installments & Payment Options</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Students can select and pay any installment. Installment amounts are fixed and editable only by the Academy Administrator.
              </p>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Amounts Fixed for Students</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {studentInstallments.map((inst) => (
              <div key={inst.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{inst.name || `Installment ${inst.installment_number}`}</span>
                    <InstallmentStatusBadge status={inst.status} />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{inst.month} · Due: {inst.due_date}</div>
                  <div className="mt-2 text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(inst.installment_amount)}
                  </div>
                  <div className="mt-1 text-xs flex justify-between">
                    <span className="text-slate-500">Remaining Due:</span>
                    <span className={inst.due_amount > 0 ? 'font-bold text-red-600' : 'text-emerald-700 font-semibold'}>
                      {inst.due_amount > 0 ? formatCurrency(inst.due_amount) : '₹0 (Paid)'}
                    </span>
                  </div>
                </div>

                {inst.due_amount > 0 ? (
                  <button
                    onClick={() => {
                      setSelectedInstallmentId(inst.id);
                      setIsPaymentModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Due ({formatCurrency(inst.due_amount)})</span>
                  </button>
                ) : (
                  <div className="mt-3 text-center py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded border border-emerald-100 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Cleared</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, ID, receipt number, txn ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700"
            >
              <option value="all">All Payment Methods</option>
              <option value="upi">UPI</option>
              <option value="netbanking">NetBanking</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Payment Ledger ({filteredPayments.length} transactions)
          </span>
          <span className="text-slate-500 font-mono">
            SUM: {formatCurrency(totalCollectedFiltered)}
          </span>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No payments found matching the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Receipt </th>
                  <th className="py-3 px-3.5">Student</th>
                  <th className="py-3 px-3.5">Course</th>
                  <th className="py-3 px-3.5">For Installment</th>
                  <th className="py-3 px-3.5 text-right">Amount</th>
                  <th className="py-3 px-3.5">Payment Method</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Recorded By</th>
                  {isAdmin && <th className="py-3 px-3.5 text-center">Receipt</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                      {p.receipt_number}
                    </td>
                    <td className="py-3 px-3.5 font-medium text-slate-900">
                      {p.student_name}
                      {p.student_code && (
                        <span className="text-[10px] text-slate-400 block font-mono">{p.student_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      {p.course_name}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 font-medium">
                      {p.installment_month}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-700 tabular-nums text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="uppercase font-semibold text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                        {p.payment_method}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.gateway}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                      {new Date(p.payment_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 text-[11px]">
                      {p.recorded_by}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => setSelectedPaymentForReceipt(p)}
                          title="Download / send receipt"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-red-700 hover:bg-slate-100 border border-slate-200 rounded text-xs transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Receipt
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- RECEIPT (ADMIN ONLY): download PDF / WhatsApp / Gmail --- */}
      {isAdmin && selectedPaymentForReceipt && (
        <ReceiptModal
          payment={selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

      {/* Student Payment Modal */}
      {currentStudent && isPaymentModalOpen && (
        <StudentPaymentModal
          student={currentStudent}
          isOpen={isPaymentModalOpen}
          initialInstallmentId={selectedInstallmentId}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedInstallmentId(undefined);
          }}
          onDataChanged={reloadData}
        />
      )}
    </div>
  );
};
