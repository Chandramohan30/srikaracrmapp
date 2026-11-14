import React, { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { Payment, Installment, Student } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../components/StatusBadges';
import { DataTable, Column, IconAction, filterSelectCls } from '../components/DataTable';
import { StudentInstallmentsTable } from '../components/StudentInstallmentsTable';
import { ReceiptModal } from '../components/ReceiptModal';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

export const PaymentsView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentInstallments, setStudentInstallments] = useState<Installment[]>([]);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>(undefined);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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

  const filteredPayments = payments.filter((p) => methodFilter === 'all' || p.payment_method === methodFilter);
  const totalCollectedFiltered = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const columns: Column<Payment>[] = [
    { key: 'receipt_number', header: 'Receipt No.', render: (p) => <span className="font-mono font-semibold text-slate-900">{p.receipt_number}</span> },
    {
      key: 'payment_date', header: 'Date',
      sortValue: (p) => new Date(p.payment_date).getTime(),
      exportValue: (p) => fmtDate(p.payment_date),
      render: (p) => <span className="tabular-nums text-slate-600">{fmtDate(p.payment_date)}</span>
    },
    {
      key: 'student_name', header: 'Student',
      render: (p) => (
        <div>
          <div className="font-semibold text-slate-900">{p.student_name}</div>
          {p.student_code && <div className="text-[10px] text-slate-400 font-mono">{p.student_code}</div>}
        </div>
      )
    },
    { key: 'course_name', header: 'Course' },
    { key: 'installment_month', header: 'For Installment' },
    {
      key: 'payment_method', header: 'Method',
      render: (p) => <span className="uppercase text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{p.payment_method}</span>
    },
    { key: 'transaction_id', header: 'Txn / UTR', render: (p) => <span className="font-mono text-[11px] text-slate-500">{p.transaction_id || '—'}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="tabular-nums font-bold text-emerald-700">{formatCurrency(p.amount)}</span> },
    { key: 'recorded_by', header: 'Recorded By', render: (p) => <span className="text-slate-500">{p.recorded_by}</span> }
  ];

  return (
    <div className="space-y-5">
      {/* Student: own installment plan with Pay buttons */}
      {currentUser.role === 'student' && currentStudent && (
        <StudentInstallmentsTable
          installments={studentInstallments}
          onPay={(id) => { setSelectedInstallmentId(id); setIsPaymentModalOpen(true); }}
        />
      )}

      <DataTable<Payment>
        title={currentUser.role === 'student' ? 'My Payment History' : 'Payment Ledger'}
        subtitle={<>{filteredPayments.length} payment(s) · Total <b className="text-emerald-700">{formatCurrency(totalCollectedFiltered)}</b></>}
        rows={filteredPayments}
        columns={columns}
        getRowId={(p) => p.id}
        searchText={(p) => `${p.receipt_number} ${p.student_name} ${p.student_code || ''} ${p.transaction_id} ${p.course_name} ${p.installment_month}`}
        searchPlaceholder="Search receipt, student, UTR…"
        exportFileName="payments"
        initialSort={{ key: 'payment_date', dir: 'desc' }}
        toolbar={
          <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className={filterSelectCls} aria-label="Payment method">
            <option value="all">All Methods</option>
            <option value="upi">UPI</option>
            <option value="netbanking">NetBanking</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
          </select>
        }
        rowActions={isAdmin ? (p) => (
          <>
            <IconAction title="Receipt (download / send)" onClick={() => setSelectedPaymentForReceipt(p)}>
              <FileText className="w-4 h-4" />
            </IconAction>
            <IconAction
              title="Delete payment"
              tone="danger"
              onClick={async () => {
                if (!window.confirm(`Delete payment ${p.receipt_number} of ₹${p.amount} for ${p.student_name}? The student's paid/outstanding amounts will be recalculated.`)) return;
                try { await db.deletePayment(p.id); reloadData(); } catch (err: any) { alert(err.message); }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconAction>
          </>
        ) : undefined}
        emptyText="No payments recorded yet."
      />

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
