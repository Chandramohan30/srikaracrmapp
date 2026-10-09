import React, { useEffect, useState } from 'react';
import { X, Download, Mail, MessageCircle, Image as ImageIcon, Loader2, AlertCircle, FileText } from 'lucide-react';
import { Payment } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from './StatusBadges';
import {
  downloadReceiptPdf, openPaymentProof, createReceiptLink,
  buildWhatsAppText, buildEmail, openWhatsApp, openGmail
} from '../services/receipts';

interface ReceiptModalProps {
  payment: Payment;
  onClose: () => void;
}

/**
 * ADMIN ONLY. Students and trainers never see this (and the API refuses them anyway).
 *  - Download  : saves the receipt as a PDF
 *  - WhatsApp  : opens the student's chat with the message typed in; admin presses Send
 *  - Gmail     : opens a compose window to the student's e-mail; admin presses Send
 */
export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  const { isAdmin } = useAuth();
  const student = db.getStudentById(payment.student_id);
  const academyName = db.getSettings().academyName;

  const [link, setLink] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [busy, setBusy] = useState<'pdf' | 'proof' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create the download link up-front so the WhatsApp / Gmail clicks can open instantly
  // (browsers block pop-ups that are opened after an await).
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    createReceiptLink(payment, 'whatsapp')
      .then(l => { if (!cancelled) { setLink(l); setLinkState('ready'); } })
      .catch(() => { if (!cancelled) setLinkState('failed'); });
    return () => { cancelled = true; };
  }, [payment.id, isAdmin]);

  if (!isAdmin) return null; // hard UI guard - receipts are admin only

  const run = async (kind: 'pdf' | 'proof') => {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'pdf') await downloadReceiptPdf(payment);
      else await openPaymentProof(payment);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(null);
    }
  };

  const onWhatsApp = () => {
    setError(null);
    if (!student) return setError('Student record not found.');
    const ok = openWhatsApp(student, buildWhatsAppText(payment, link, academyName));
    if (!ok) setError(`No phone number saved for ${student.full_name}. Add it in the student profile.`);
  };

  const onGmail = () => {
    setError(null);
    if (!student) return setError('Student record not found.');
    const { subject, body } = buildEmail(payment, link, academyName);
    const ok = openGmail(student, subject, body);
    if (!ok) setError(`No e-mail saved for ${student.full_name}.`);
  };

  const sendDisabled = linkState === 'loading';

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-900/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-red-700/80 rounded-lg"><FileText className="w-4 h-4" /></div>
            <div>
              <h4 className="text-sm font-bold leading-tight">Fee Receipt</h4>
              <p className="text-[11px] font-mono text-slate-400">{payment.receipt_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5">
            <Row k="Student" v={`${payment.student_name}${payment.student_code ? ` · ${payment.student_code}` : ''}`} />
            <Row k="Course" v={payment.course_name} />
            <Row k="Installment" v={payment.installment_month} />
            <Row k="Date" v={new Date(payment.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Row k="Reference" v={payment.transaction_id} mono />
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
              <span className="font-bold text-slate-700">Amount Paid</span>
              <span className="font-black text-emerald-700 text-lg tabular-nums">{formatCurrency(payment.amount)}</span>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={() => run('pdf')}
            disabled={busy === 'pdf'}
            className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Receipt (PDF)
          </button>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Send to student</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onWhatsApp}
                disabled={sendDisabled}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button
                onClick={onGmail}
                disabled={sendDisabled}
                className="py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 border border-slate-300 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4 text-red-600" /> Gmail
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              {linkState === 'failed'
                ? 'Could not create the download link, so the message will not contain one. Download the PDF and attach it manually.'
                : 'Opens the student\'s chat / a new e-mail with the message typed in and a PDF download link. You just press Send.'}
            </p>
          </div>

          {payment.has_proof && (
            <button
              onClick={() => run('proof')}
              disabled={busy === 'proof'}
              className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-red-700 border border-dashed border-slate-300 rounded-lg flex items-center justify-center gap-1.5"
            >
              {busy === 'proof' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              View payment screenshot uploaded by student
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ k: string; v: string; mono?: boolean }> = ({ k, v, mono }) => (
  <div className="flex justify-between gap-3">
    <span className="text-slate-500 shrink-0">{k}</span>
    <span className={`font-semibold text-slate-900 text-right break-all ${mono ? 'font-mono text-[11px]' : ''}`}>{v}</span>
  </div>
);
