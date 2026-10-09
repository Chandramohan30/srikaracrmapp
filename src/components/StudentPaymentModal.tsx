import React, { useState } from 'react';
import { 
  X, CreditCard, Clock, Calendar, CheckCircle, AlertCircle, 
  Plus, Edit2, ShieldAlert, ArrowRight, Sparkles, AlertTriangle, Lock,
  Copy, Check, Smartphone, UploadCloud, Loader2, FileText, ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, Installment, Payment, ManualInstallmentInput } from '../types/crm';
import { db } from '../services/db';
import { getActualDue, getPayableNow, getDisplayDue } from '../server/finance';
import { useAuth } from '../context/AuthContext';
import { 
  formatCurrency, DueBadge, InstallmentStatusBadge, 
  StudentPaymentStatusBadge 
} from './StatusBadges';
import { fileToCompressedDataUrl } from '../services/image';
import { ACADEMY_UPI_ID, ACADEMY_UPI_PAYEE } from '../server/config';
import { ReceiptModal } from './ReceiptModal';

interface StudentPaymentModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  initialInstallmentId?: string;
}

export const StudentPaymentModal: React.FC<StudentPaymentModalProps> = ({
  student,
  isOpen,
  onClose,
  onDataChanged,
  initialInstallmentId
}) => {
  const { currentUser, isAdmin } = useAuth();

  // Installments and payments for this student
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Payment checkout state
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [customPayAmount, setCustomPayAmount] = useState<number>(0);
  const [payStep, setPayStep] = useState<'pay' | 'proof'>('pay');
  const [copied, setCopied] = useState(false);
  const [proofPreview, setProofPreview] = useState<string | null>(null); // compressed data URL
  const [proofName, setProofName] = useState('');
  const [utr, setUtr] = useState('');
  const [isReadingProof, setIsReadingProof] = useState(false);
  const [receiptFor, setReceiptFor] = useState<Payment | null>(null); // admin only
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Success Receipt view
  const [completedPayment, setCompletedPayment] = useState<Payment | null>(null);

  // Admin Manual Installment modal state
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<ManualInstallmentInput>({
    student_id: student.id,
    amount: 5000,
    month: 'April 2026',
    due_date: '2026-04-10',
    notes: 'Placement training fee adjustment'
  });

  // Admin Edit Installment modal state
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  // Settle leftover balance (admin): add to next installment OR create a sub-installment
  const [settlingInstallment, setSettlingInstallment] = useState<Installment | null>(null);
  const [settleMode, setSettleMode] = useState<'next' | 'sub'>('next');
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleDueDate, setSettleDueDate] = useState<string>('');
  const [settleMonth, setSettleMonth] = useState<string>('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editPayNow, setEditPayNow] = useState<number>(0);
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editMonth, setEditMonth] = useState<string>('');

  // Reload data
  const reloadData = () => {
    const insts = db.getInstallments(student.id);
    const pays = db.getPayments(student.id);
    setInstallments(insts);
    setPayments(pays);
  };

  React.useEffect(() => {
    if (isOpen) {
      reloadData();
      if (initialInstallmentId) {
        const insts = db.getInstallments(student.id);
        const target = insts.find(i => i.id === initialInstallmentId) || insts[0];
        if (target) {
          setSelectedInstallment(target);
          setCustomPayAmount((getPayableNow(target) || target.installment_amount));
        }
      } else {
        setSelectedInstallment(null);
      }
      setCompletedPayment(null);
      setPaymentError(null);
    }
  }, [isOpen, student.id, initialInstallmentId]);

  if (!isOpen) return null;

  // Initiate Payment Flow
  const getBlockingInstallment = (inst: Installment) =>
    installments.find(i => i.installment_number < inst.installment_number && getActualDue(i) > 0.01);

  const resetCheckout = () => {
    setPayStep('pay');
    setProofPreview(null);
    setProofName('');
    setUtr('');
    setCopied(false);
    setPaymentError(null);
  };

  const closeCheckout = () => {
    setSelectedInstallment(null);
    resetCheckout();
  };

  const handleInitiatePayment = (inst: Installment) => {
    const blocker = getBlockingInstallment(inst);
    if (blocker) {
      alert(`Please clear the due of ${blocker.name || 'Installment ' + blocker.installment_number} (${formatCurrency(getActualDue(blocker))}) before paying this installment.`);
      return;
    }
    resetCheckout();
    setSelectedInstallment(inst);
    // Students always pay exact due amount; Admin defaults to it but can edit
    setCustomPayAmount((getPayableNow(inst) || inst.installment_amount));
  };

  // Amount that will be paid (students: locked, admin: editable)
  const getEffectiveAmount = () =>
    selectedInstallment
      ? (!isAdmin
          ? ((getPayableNow(selectedInstallment) || selectedInstallment.installment_amount))
          : customPayAmount)
      : 0;

  const validateAmount = (): string | null => {
    if (!selectedInstallment) return 'No installment selected';
    const amt = getEffectiveAmount();
    if (!(amt > 0)) return 'Please enter a valid amount greater than ₹0';
    if (amt > getActualDue(selectedInstallment) + 0.01) {
      return `Amount cannot exceed the remaining due of ${formatCurrency(getActualDue(selectedInstallment))}`;
    }
    return null;
  };

  const upiLink = () => {
    const amt = getEffectiveAmount();
    const note = `${student.student_code} ${selectedInstallment?.month || ''}`.trim();
    return `upi://pay?pa=${encodeURIComponent(ACADEMY_UPI_ID)}&pn=${encodeURIComponent(ACADEMY_UPI_PAYEE)}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`;
  };

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(ACADEMY_UPI_ID);
    } catch {
      // clipboard blocked (e.g. insecure context): fall back to a temporary textarea
      const t = document.createElement('textarea');
      t.value = ACADEMY_UPI_ID;
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 1 -> 2: student says "I have paid"
  const handleContinueToProof = () => {
    const err = validateAmount();
    if (err) { setPaymentError(err); return; }
    setPaymentError(null);
    setPayStep('proof');
  };

  const handleProofSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;
    setIsReadingProof(true);
    setPaymentError(null);
    try {
      setProofPreview(await fileToCompressedDataUrl(file));
      setProofName(file.name);
    } catch (err: any) {
      setProofPreview(null);
      setProofName('');
      setPaymentError(err.message || 'Could not read the image');
    } finally {
      setIsReadingProof(false);
    }
  };

  // Step 2: "Verify" - only possible with a screenshot. This submits and clears the installment.
  const handleVerifyPayment = async () => {
    if (!selectedInstallment) return;
    if (!proofPreview) {
      setPaymentError('Upload your payment screenshot first. Payment cannot be submitted without it.');
      return;
    }
    const err = validateAmount();
    if (err) { setPaymentError(err); return; }
    if (utr && !/^\d{12}$/.test(utr)) {
      setPaymentError('UPI reference (UTR) must be exactly 12 digits, or leave it empty.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const newPayment = await db.recordPayment({
        student_id: student.id,
        installment_id: selectedInstallment.id,
        amount: getEffectiveAmount(),
        utr: utr || undefined,
        proof_screenshot: proofPreview,
        notes: `UPI payment to ${ACADEMY_UPI_ID} for ${selectedInstallment.month}`
      }, currentUser);

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch { /* ignore */ }

      setCompletedPayment(newPayment);
      closeCheckout();
      reloadData();
      onDataChanged();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment could not be submitted');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Admin Manual Installment Submit
  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.addManualInstallment({
        ...manualForm,
        student_id: student.id
      }, currentUser);
      setShowManualModal(false);
      reloadData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingInstallment) return;
    try {
      await db.settleInstallmentBalance(settlingInstallment.id, {
        mode: settleMode,
        amount: settleAmount,
        due_date: settleDueDate,
        month: settleMonth
      }, currentUser);
      setSettlingInstallment(null);
      reloadData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Admin Edit Installment Submit
  const handleEditInstallmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstallment) return;
    try {
      await db.updateInstallment(editingInstallment.id, {
        installment_amount: editAmount,
        pay_now: editPayNow,
        due_date: editDueDate,
        month: editMonth
      }, currentUser);
      setEditingInstallment(null);
      reloadData();
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-700/80 rounded-lg text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Student Payment Details
                </h2>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {student.student_code}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {student.full_name} · {student.course_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 16 & 18: Student Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Course Fee
              </span>
              <span className="text-lg font-bold text-slate-900 tabular-nums">
                {formatCurrency(student.total_course_amount)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Course: {student.course_name}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Amount Paid
              </span>
              <span className="text-lg font-bold text-emerald-700 tabular-nums">
                {formatCurrency(student.total_paid)}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                {payments.length} valid transaction(s)
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Outstanding
              </span>
              <span className="text-lg font-bold text-red-700 tabular-nums">
                {formatCurrency(student.total_outstanding)}
              </span>
              <span className="text-[10px] text-red-600 block mt-0.5 font-medium">
                {student.total_outstanding > 0 ? 'Balance remaining' : 'Zero balance'}
              </span>
            </div>

            <div className="flex flex-col justify-center items-start sm:items-end">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Payment Status
              </span>
              <StudentPaymentStatusBadge status={student.payment_status} />
              {student.total_outstanding > 0 && (
                <div className="mt-1.5">
                  <DueBadge amount={student.total_outstanding} />
                </div>
              )}
            </div>
          </div>

          {/* Section 8, 9, 10, 11, 12: Installments Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Installment Schedule & Dues
                </h3>
                
              </div>

              {/* Admin Only Manual Installment Button (Rule 14) */}
              {isAdmin && (
                <button
                  onClick={() => setShowManualModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Manual Installment
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Installment</th>
                    <th className="py-2.5 px-3.5">Month</th>
                    <th className="py-2.5 px-3.5 text-right">Amount</th>
                    <th className="py-2.5 px-3.5 text-right">Paid</th>
                    <th className="py-2.5 px-3.5 text-right">Due Amount</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {installments.map((inst) => {
                    const hasDue = inst.due_amount > 0;
                    return (
                      <tr 
                        key={inst.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          hasDue && inst.status === 'overdue' ? 'bg-red-50/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3.5 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span>{inst.name || `Installment ${inst.installment_number}`}</span>
                            {inst.is_manual && (
                              <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1 rounded">
                                Manual
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Due: {inst.due_date}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 font-medium">
                          {inst.month}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(inst.installment_amount)}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-emerald-700 tabular-nums">
                          {formatCurrency(inst.paid_amount)}
                        </td>
                        <td className="py-3 px-3.5 text-right tabular-nums">
                          {hasDue ? (
                            <span className="font-bold text-red-600">
                              {formatCurrency(inst.due_amount)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <InstallmentStatusBadge status={inst.status} />
                          {inst.pay_now_amount && inst.pay_now_amount > inst.paid_amount && (
                            <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                              Pays now: {formatCurrency(inst.pay_now_amount - inst.paid_amount)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Admin edit button */}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingInstallment(inst);
                                  setEditAmount(inst.installment_amount);
                                  setEditPayNow(getPayableNow(inst));
                                  setEditDueDate(inst.due_date);
                                  setEditMonth(inst.month);
                                }}
                                title="Edit Installment (Admin Only)"
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Admin: settle leftover balance (e.g. ₹500 left after ₹17,000 of ₹17,500) */}
                            {isAdmin && inst.paid_amount > 0 && getActualDue(inst) > 0.01 && (
                              <button
                                onClick={() => {
                                  setSettlingInstallment(inst);
                                  setSettleMode('next');
                                  setSettleAmount(getActualDue(inst));
                                  setSettleDueDate(inst.due_date);
                                  setSettleMonth(inst.month);
                                }}
                                title="Settle leftover balance"
                                className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded whitespace-nowrap"
                              >
                                Settle Balance
                              </button>
                            )}

                            {/* Pay button (Available to student or admin, rule 12: ANY installment can be paid!) */}
                            {getActualDue(inst) > 0.01 ? (
                              <button
                                onClick={() => handleInitiatePayment(inst)}
                                disabled={!!getBlockingInstallment(inst)}
                                title={getBlockingInstallment(inst) ? 'Clear the previous installment due first' : ''}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded shadow-2xs transition-colors whitespace-nowrap disabled:bg-slate-300 disabled:cursor-not-allowed"
                              >
                                {getBlockingInstallment(inst) ? 'Locked' : 'Make Payment'}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                <CheckCircle className="w-3 h-3" />
                                Cleared
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 13 & 32: Payment History (All individual transactions) */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">
              Payment Transaction History
            </h3>
            {payments.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-xs">
                No payment transactions recorded yet for this student.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Receipt #</th>
                      <th className="py-2.5 px-3.5">For Installment</th>
                      <th className="py-2.5 px-3.5 text-right">Amount</th>
                      <th className="py-2.5 px-3.5">Method & Gateway</th>
                      <th className="py-2.5 px-3.5">Date</th>
                      <th className="py-2.5 px-3.5">Recorded By</th>
                      {isAdmin && <th className="py-2.5 px-3.5 text-center">Receipt</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-800 font-semibold">
                          {p.receipt_number}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-700 font-medium">
                          {p.installment_month}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-emerald-700 tabular-nums">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600">
                          <span className="uppercase font-semibold text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                            {p.payment_method}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {p.gateway}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                          {new Date(p.payment_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 text-[11px]">
                          {p.recorded_by}
                        </td>
                        {isAdmin && (
                          <td className="py-2.5 px-3.5 text-center">
                            <button
                              onClick={() => setReceiptFor(p)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-slate-700 hover:text-red-700 hover:bg-slate-100 border border-slate-200 rounded text-[11px] transition-colors"
                            >
                              <FileText className="w-3 h-3" />
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
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Payments via UPI · screenshot verified</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* --- SUB-MODAL 1: UPI CHECKOUT (pay -> upload screenshot -> verify) --- */}
        {selectedInstallment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {payStep === 'pay' ? 'Pay via UPI' : 'Upload Payment Screenshot'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Step {payStep === 'pay' ? '1' : '2'} of 2 · Srikara Training & Placement Academy
                  </p>
                </div>
                <button onClick={closeCheckout} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-red-900">
                      {selectedInstallment.name || `Installment ${selectedInstallment.installment_number}`} ({selectedInstallment.month})
                    </span>
                    <span className="text-red-700 font-mono font-bold">
                      Due: {formatCurrency(getActualDue(selectedInstallment))}
                    </span>
                  </div>
                </div>

                {payStep === 'pay' && (
                  <>
                    {/* Amount: editable ONLY by Admin, fixed for Student */}
                    {isAdmin ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">Amount to Pay (INR)</label>
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded border border-red-200">
                            Admin: Amount is Editable
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={customPayAmount}
                            onChange={(e) => setCustomPayAmount(parseFloat(e.target.value) || 0)}
                            className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none tabular-nums"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                          <span>Full installment due: {formatCurrency(getActualDue(selectedInstallment))}</span>
                          <button
                            type="button"
                            onClick={() => setCustomPayAmount(getActualDue(selectedInstallment))}
                            className="text-red-700 hover:underline font-semibold"
                          >
                            Reset to Full Due
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Amount to Pay (Fixed)</span>
                          </label>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-slate-400" />
                            <span>Editable only by Admin</span>
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">₹</span>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={getEffectiveAmount().toLocaleString('en-IN')}
                            className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed select-none tabular-nums"
                          />
                        </div>
                      </div>
                    )}

                    {/* UPI ID */}
                    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4 text-center">
                      <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Pay to this UPI ID</p>
                      <p className="mt-1.5 text-lg font-bold text-slate-900 font-mono break-all select-all">
                        {ACADEMY_UPI_ID}
                      </p>
                      <div className="mt-3 flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={copyUpi}
                          className="px-3 py-1.5 text-xs font-semibold bg-white border border-emerald-300 text-emerald-800 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5"
                        >
                          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copied' : 'Copy UPI ID'}
                        </button>
                        <a
                          href={upiLink()}
                          className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          Open UPI app
                        </a>
                      </div>
                      <p className="mt-2.5 text-[11px] text-slate-600">
                        Pay exactly <b>{formatCurrency(getEffectiveAmount())}</b> using GPay, PhonePe, Paytm or any UPI app.
                        "Open UPI app" works on mobile only.
                      </p>
                    </div>
                  </>
                )}

                {payStep === 'proof' && (
                  <>
                    <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      Paid <b className="text-slate-900">{formatCurrency(getEffectiveAmount())}</b> to{' '}
                      <span className="font-mono font-semibold text-slate-900">{ACADEMY_UPI_ID}</span>.
                      Upload the screenshot showing the successful payment, then press <b>Verify</b>.
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Payment screenshot <span className="text-red-600">*</span>
                      </label>
                      <label
                        className={`block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-colors ${
                          proofPreview ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 hover:border-red-400 hover:bg-red-50/40'
                        }`}
                      >
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProofSelected} className="hidden" />
                        {isReadingProof ? (
                          <div className="py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Preparing image...
                          </div>
                        ) : proofPreview ? (
                          <div className="space-y-2">
                            <img src={proofPreview} alt="Payment screenshot preview" className="max-h-56 mx-auto rounded-lg border border-slate-200 shadow-xs" />
                            <p className="text-[11px] text-emerald-700 font-semibold truncate">{proofName}</p>
                            <p className="text-[11px] text-slate-500">Tap to choose a different screenshot</p>
                          </div>
                        ) : (
                          <div className="py-5 text-slate-500">
                            <UploadCloud className="w-8 h-8 mx-auto text-slate-400" />
                            <p className="text-xs font-semibold mt-1.5 text-slate-700">Tap to upload screenshot</p>
                            <p className="text-[11px] mt-0.5">PNG, JPG or WEBP</p>
                          </div>
                        )}
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        UPI reference / UTR <span className="font-normal text-slate-400">(optional, 12 digits)</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={utr}
                        onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 412345678901"
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
                      />
                    </div>
                  </>
                )}

                {paymentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {payStep === 'pay' ? (
                    <button
                      onClick={handleContinueToProof}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>I have paid {formatCurrency(getEffectiveAmount())} — Continue</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleVerifyPayment}
                        disabled={!proofPreview || isProcessingPayment || isReadingProof}
                        className="w-full py-2.5 px-4 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {isProcessingPayment ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /><span>Verify</span></>
                        )}
                      </button>
                      {!proofPreview && (
                        <p className="text-[11px] text-center text-slate-500">Upload the screenshot to enable Verify.</p>
                      )}
                      <button
                        onClick={() => { setPayStep('pay'); setPaymentError(null); }}
                        disabled={isProcessingPayment}
                        className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to UPI details
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SUB-MODAL 2: PAYMENT SUCCESS --- */}
        {completedPayment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7" />
              </div>

              <h4 className="text-base font-bold text-slate-900">Payment Verified!</h4>
              <p className="text-xs text-slate-500 mt-1">
                {isAdmin
                  ? `Receipt #${completedPayment.receipt_number} has been generated.`
                  : 'Your installment has been cleared. The academy will share your receipt with you.'}
              </p>

              <div className="my-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-900">{completedPayment.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Course:</span>
                  <span className="font-semibold text-slate-900">{completedPayment.course_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Installment:</span>
                  <span className="font-semibold text-slate-900">{completedPayment.installment_month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatCurrency(completedPayment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference:</span>
                  <span className="font-mono text-slate-700 text-[11px]">{completedPayment.transaction_id}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setReceiptFor(completedPayment)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Receipt
                  </button>
                )}
                <button
                  onClick={() => setCompletedPayment(null)}
                  className="flex-1 py-2 px-3 bg-red-700 hover:bg-red-800 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {receiptFor && isAdmin && (
          <ReceiptModal payment={receiptFor} onClose={() => setReceiptFor(null)} />
        )}

        {/* --- SUB-MODAL 3: ADMIN MANUAL INSTALLMENT MODAL (Rule 14) --- */}
        {showManualModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    + Add Manual Installment
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Administrator privilege only
                  </p>
                </div>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddManualSubmit} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${student.full_name} (${student.student_code})`}
                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded text-slate-700"
                  />
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
                    Notes / Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                    placeholder="Reason for manual installment adjustment..."
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
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

        {/* --- SUB-MODAL 5: ADMIN SETTLE LEFTOVER BALANCE --- */}
        {settlingInstallment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Settle Balance ({settlingInstallment.name || `Installment ${settlingInstallment.installment_number}`})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Paid {formatCurrency(settlingInstallment.paid_amount)} of {formatCurrency(settlingInstallment.installment_amount)}
                    {' '}· Left {formatCurrency(getActualDue(settlingInstallment))}
                  </p>
                </div>
                <button onClick={() => setSettlingInstallment(null)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSettleSubmit} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Balance amount to settle (INR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={getActualDue(settlingInstallment)}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className={`flex items-start gap-2 rounded border px-3 py-2 cursor-pointer ${settleMode === 'next' ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
                    <input type="radio" checked={settleMode === 'next'} onChange={() => setSettleMode('next')} className="mt-0.5" />
                    <span>
                      <b>Add to next installment</b>
                      <span className="block text-[11px] text-slate-500">
                        This installment is closed at the amount already paid. The balance is added to the next installment.
                      </span>
                    </span>
                  </label>
                  <label className={`flex items-start gap-2 rounded border px-3 py-2 cursor-pointer ${settleMode === 'sub' ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
                    <input type="radio" checked={settleMode === 'sub'} onChange={() => setSettleMode('sub')} className="mt-0.5" />
                    <span>
                      <b>Create sub-installment under this one</b>
                      <span className="block text-[11px] text-slate-500">
                        Creates e.g. Installment {settlingInstallment.installment_number}.1 for the balance. The next installment stays locked until it is paid.
                      </span>
                    </span>
                  </label>
                </div>

                {settleMode === 'sub' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Month</label>
                      <input
                        type="text"
                        required
                        value={settleMonth}
                        onChange={(e) => setSettleMonth(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                      <input
                        type="date"
                        required
                        value={settleDueDate}
                        onChange={(e) => setSettleDueDate(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500">The student's total course fee does not change.</p>

                <div className="pt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setSettlingInstallment(null)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs">
                    Settle Balance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- SUB-MODAL 4: ADMIN EDIT INSTALLMENT (Rule 11 & 15) --- */}
        {editingInstallment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Edit Installment ({editingInstallment.month})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Administrator privilege only
                  </p>
                </div>
                <button
                  onClick={() => setEditingInstallment(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditInstallmentSubmit} className="p-5 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Installment Amount (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={editingInstallment.paid_amount}
                    value={editAmount}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setEditAmount(v);
                      // keep "pay now" inside the remaining due
                      setEditPayNow(prev => Math.min(prev, Math.max(0, v - editingInstallment.paid_amount)));
                    }}
                    className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Already paid: {formatCurrency(editingInstallment.paid_amount)}. Total fee changes only if you change this amount.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Student will pay now (INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={Math.max(0, editAmount - editingInstallment.paid_amount)}
                    value={editPayNow}
                    onChange={(e) => setEditPayNow(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-amber-300 bg-amber-50/40 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <div className="mt-2 flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2">
                    <span className="font-semibold text-red-900">Due left in this installment</span>
                    <span className="font-bold text-red-700 tabular-nums">
                      {formatCurrency(Math.max(0, editAmount - editingInstallment.paid_amount - editPayNow))}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    The remaining due stays in this same installment. It is not moved to the next one,
                    and the next installment stays locked until this one is fully paid.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Month
                    </label>
                    <input
                      type="text"
                      required
                      value={editMonth}
                      onChange={(e) => setEditMonth(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingInstallment(null)}
                    className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
