import { authedFetch, api } from './db';
import { Payment, Student } from '../types/crm';

/** Turns any Indian phone format into digits for wa.me (default country code: 91) */
export function toWhatsAppNumber(phone: string, defaultCountryCode = '91'): string {
  let d = (phone || '').replace(/\D/g, '');
  if (!d) return '';
  d = d.replace(/^00/, '');
  if (d.length === 10) return defaultCountryCode + d;           // 9876543210
  if (d.length === 11 && d.startsWith('0')) return defaultCountryCode + d.slice(1); // 09876543210
  return d;                                                        // already has country code
}

async function errorFrom(res: Response): Promise<Error> {
  let msg = `Request failed (${res.status})`;
  try { msg = (await res.json())?.error || msg; } catch { /* ignore */ }
  return new Error(msg);
}

/** File name: StudentName_YYYY-MM-DD.pdf (today's date, India time) */
export function receiptFileName(payment: Payment): string {
  const name = (payment.student_name || 'Student')
    .trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Student';
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // 2026-10-09
  return `${name}_${date}.pdf`;
}

/** Fetches the PDF receipt as a Blob (admin only - the server enforces it) */
export async function fetchReceiptBlob(payment: Payment): Promise<Blob> {
  const res = await authedFetch('GET', `/api/payments/${payment.id}/receipt`);
  if (!res.ok) throw await errorFrom(res);
  return res.blob();
}

/** Saves a Blob to the computer's Downloads folder (synchronous, so it works inside a click) */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function downloadReceiptPdf(payment: Payment): Promise<void> {
  saveBlob(await fetchReceiptBlob(payment), receiptFileName(payment));
}

/** Opens the student's payment screenshot in a new tab (admin only) */
export async function openPaymentProof(payment: Payment): Promise<void> {
  const win = window.open('', '_blank'); // opened synchronously so popup blockers allow it
  try {
    const res = await authedFetch('GET', `/api/payments/${payment.id}/proof`);
    if (!res.ok) throw await errorFrom(res);
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url; else window.open(url, '_blank');
  } catch (e) {
    win?.close();
    throw e;
  }
}

/** Signed, expiring link to the PDF; it goes inside the WhatsApp / e-mail text */
export async function createReceiptLink(payment: Payment, channel: 'whatsapp' | 'email'): Promise<string> {
  const r = await api<{ path: string }>('POST', `/api/payments/${payment.id}/receipt-link`, { channel });
  return `${window.location.origin}${r.path}`;
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateStr = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export function buildWhatsAppText(p: Payment, link: string | null, academyName: string): string {
  return [
    `Dear ${p.student_name},`,
    '',
    `We have received your payment of ${inr(p.amount)} towards ${p.course_name} (${p.installment_month}).`,
    '',
    `Receipt No: ${p.receipt_number}`,
    `Date: ${dateStr(p.payment_date)}`,
    link ? `\nDownload your receipt:\n${link}` : '\nYour fee receipt (PDF) is attached.',
    '',
    `Thank you,`,
    academyName
  ].join('\n');
}

export function buildEmail(p: Payment, link: string | null, academyName: string) {
  return {
    subject: `Fee Receipt ${p.receipt_number} - ${academyName}`,
    body: [
      `Dear ${p.student_name},`,
      '',
      `Thank you. We have received your payment of ${inr(p.amount)} towards ${p.course_name} (${p.installment_month}).`,
      '',
      `Receipt No   : ${p.receipt_number}`,
      `Payment Date : ${dateStr(p.payment_date)}`,
      `Amount       : ${inr(p.amount)}`,
      `Reference    : ${p.transaction_id}`,
      link ? `\nDownload your receipt (PDF):\n${link}` : '\nYour fee receipt (PDF) is attached to this e-mail.',
      '',
      'Regards,',
      academyName
    ].join('\n')
  };
}

/** WhatsApp: opens the student's chat with the message typed in. Admin presses Send. */
export function openWhatsApp(student: Student, text: string): boolean {
  const number = toWhatsAppNumber(student.phone);
  if (!number) return false;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  return true;
}

/** Gmail: opens a compose window addressed to the student, subject + body filled in. */
export function openGmail(student: Student, subject: string, body: string): boolean {
  if (!student.email) return false;
  const q = new URLSearchParams({ view: 'cm', fs: '1', to: student.email, su: subject, body });
  window.open(`https://mail.google.com/mail/?${q.toString()}`, '_blank', 'noopener');
  return true;
}