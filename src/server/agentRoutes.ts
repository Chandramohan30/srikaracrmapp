/**
 * Routes used ONLY by the LangChain/Groq agent (agent/ folder).
 * Protected by a shared secret header:  x-agent-key: <AGENT_API_KEY>
 * The agent acts as an admin, so never expose this key to the browser.
 */
import crypto from 'crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import { StudentModel, UserModel, InstallmentModel, PaymentModel, LeaveModel, CourseModel, FollowUpModel } from './models.js';
import {
  STOP_STATUSES, startFollowUp, stopFollowUp, syncFollowUpWithStudent, sendManual
} from './followups.js';
import { whatsappStatus } from './whatsapp.js';

const STUDENT_STATUSES = ['lead', 'onboarding', 'active', 'inactive', 'on_hold', 'completed', 'dropped', 'cancelled'];
const AGENT_ACTOR = { id: 'ai-agent', name: 'AI Agent', role: 'admin' };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function lean(doc: any) {
  if (!doc) return doc;
  const o = { ...doc };
  delete o._id; delete o.__v; delete o.password_hash;
  return o;
}

const brief = (s: any) => ({
  id: s.id, student_code: s.student_code, name: s.full_name, phone: s.phone, email: s.email,
  course: s.course_name, trainer: s.trainer_name, status: s.status, payment_status: s.payment_status,
  total_fee: s.total_course_amount, paid: s.total_paid, outstanding: s.total_outstanding, joining_date: s.joining_date
});

export function registerAgentRoutes(app: Express, deps: {
  HttpError: new (status: number, message: string) => Error;
  wrap: (fn: (req: any, res: Response) => Promise<any>) => any;
  logAudit: (actor: any, action: string, entity: string, id: string, oldV?: string, newV?: string) => Promise<void>;
}) {
  const { HttpError, wrap, logAudit } = deps;

  const agentAuth = (req: Request, _res: Response, next: NextFunction) => {
    const expected = process.env.AGENT_API_KEY || '';
    if (!expected) return next(new HttpError(503, 'AGENT_API_KEY is not configured on the CRM server.'));
    const got = String(req.headers['x-agent-key'] || '');
    const a = Buffer.from(got), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return next(new HttpError(401, 'Invalid agent key.'));
    next();
  };

  /** Resolve "SRK-2026-001", "std-ab12cd34", a phone number or a (partial) name to exactly one student. */
  async function resolveStudent(ref: string): Promise<any> {
    const q = String(ref || '').trim();
    if (!q) throw new HttpError(400, 'student reference is required');
    let found: any[] = await StudentModel.find({ $or: [{ id: q }, { student_code: new RegExp(`^${esc(q)}$`, 'i') }] }).limit(5).lean();
    const digits = q.replace(/\D/g, '');
    if (!found.length && digits.length >= 7) found = await StudentModel.find({ phone: new RegExp(digits.slice(-10) + '$') }).limit(5).lean();
    if (!found.length) found = await StudentModel.find({ full_name: new RegExp(esc(q), 'i') }).limit(6).lean();
    if (!found.length) throw new HttpError(404, `No student found for "${q}".`);
    if (found.length > 1) {
      const list = found.map(s => `${s.full_name} (${s.student_code}, ${s.course_name}, ${s.status})`).join('; ');
      throw new HttpError(409, `More than one student matches "${q}": ${list}. Ask the admin which one (use the student code).`);
    }
    return found[0];
  }

  const r = '/api/agent';

  app.get(`${r}/summary`, agentAuth, wrap(async (_req, res) => {
    const byStatus = await StudentModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const money = await StudentModel.aggregate([{ $group: { _id: null, fee: { $sum: '$total_course_amount' }, paid: { $sum: '$total_paid' }, outstanding: { $sum: '$total_outstanding' } } }]);
    res.json({
      students_by_status: Object.fromEntries(byStatus.map(x => [x._id, x.count])),
      total_students: byStatus.reduce((s, x) => s + x.count, 0),
      money: money[0] ? { total_fee: money[0].fee, collected: money[0].paid, outstanding: money[0].outstanding } : {},
      overdue_installments: await InstallmentModel.countDocuments({ status: 'overdue' }),
      pending_leaves: await LeaveModel.countDocuments({ status: 'pending' }),
      active_whatsapp_followups: await FollowUpModel.countDocuments({ active: true })
    });
  }));

  app.get(`${r}/courses`, agentAuth, wrap(async (_req, res) => {
    const c = await CourseModel.find().lean();
    res.json(c.map(x => ({ id: x.id, code: x.course_code, name: x.course_name, duration: x.duration, price: x.base_price, status: x.status })));
  }));

  app.get(`${r}/students`, agentAuth, wrap(async (req, res) => {
    const { q, status, course, payment_status } = req.query as Record<string, string>;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const filter: any = {};
    if (status) filter.status = status;
    if (payment_status) filter.payment_status = payment_status;
    if (course) filter.course_name = new RegExp(esc(course), 'i');
    if (q) {
      const rx = new RegExp(esc(q), 'i');
      filter.$or = [{ full_name: rx }, { student_code: rx }, { phone: rx }, { email: rx }];
    }
    const [rows, total] = await Promise.all([
      StudentModel.find(filter).sort({ created_at: -1 }).limit(limit).lean(),
      StudentModel.countDocuments(filter)
    ]);
    res.json({ total, shown: rows.length, students: rows.map(brief) });
  }));

  app.get(`${r}/students/:ref`, agentAuth, wrap(async (req, res) => {
    const s = await resolveStudent(req.params.ref);
    const [installments, payments, leaves, fu] = await Promise.all([
      InstallmentModel.find({ student_id: s.id }).sort({ installment_number: 1, sub_number: 1 }).lean(),
      PaymentModel.find({ student_id: s.id }).sort({ created_at: -1 }).limit(10).lean(),
      LeaveModel.find({ student_id: s.id }).sort({ created_at: -1 }).limit(5).lean(),
      FollowUpModel.findOne({ student_id: s.id }).lean() as any
    ]);
    res.json({
      student: lean(s),
      installments: installments.map(i => ({ name: i.name, month: i.month, amount: i.installment_amount, paid: i.paid_amount, due: i.due_amount, due_date: i.due_date, status: i.status })),
      recent_payments: payments.map(p => ({ amount: p.amount, date: p.payment_date, method: p.payment_method, receipt: p.receipt_number })),
      leaves: leaves.map(l => ({ from: l.from_date, to: l.to_date, status: l.status, reason: l.reason })),
      whatsapp_followup: fu ? { active: fu.active, messages_sent: fu.messages_sent, last_sent_at: fu.last_sent_at, stopped_reason: fu.stopped_reason } : null
    });
  }));

  app.get(`${r}/dues`, agentAuth, wrap(async (_req, res) => {
    const rows = await InstallmentModel.find({ status: { $in: ['overdue', 'partially_paid'] }, due_amount: { $gt: 0 } }).sort({ due_date: 1 }).limit(50).lean();
    res.json(rows.map(i => ({ student: i.student_name, code: i.student_code, installment: i.name, month: i.month, due: i.due_amount, due_date: i.due_date, status: i.status })));
  }));

  app.get(`${r}/leaves`, agentAuth, wrap(async (req, res) => {
    const status = (req.query.status as string) || 'pending';
    const rows = await LeaveModel.find({ status }).sort({ created_at: -1 }).limit(30).lean();
    res.json(rows.map(l => ({ id: l.id, student: l.student_name, code: l.student_code, from: l.from_date, to: l.to_date, days: l.days, reason: l.reason, status: l.status })));
  }));

  // --- change student status (inactive etc.) -> also stops / resumes the WhatsApp scheduler ---
  app.put(`${r}/students/:ref/status`, agentAuth, wrap(async (req, res) => {
    const status = String(req.body?.status || '').toLowerCase().trim();
    if (!STUDENT_STATUSES.includes(status)) throw new HttpError(400, `status must be one of: ${STUDENT_STATUSES.join(', ')}`);
    const s = await resolveStudent(req.params.ref);
    const old = s.status;
    await StudentModel.updateOne({ id: s.id }, { status });
    await UserModel.updateOne({ id: s.user_id }, { status: ['dropped', 'cancelled', 'inactive'].includes(status) ? 'inactive' : 'active' });
    await logAudit(AGENT_ACTOR, 'UPDATE_STUDENT', 'Student', s.id, `Status: ${old}`, `Status: ${status} (via AI agent)`);
    const fresh = await StudentModel.findOne({ id: s.id }).lean();
    await syncFollowUpWithStudent(fresh);
    const fu: any = await FollowUpModel.findOne({ student_id: s.id }).lean();
    res.json({
      message: `${s.full_name} status changed ${old} -> ${status}.`,
      whatsapp_scheduler: fu?.active ? 'active (messaging continues)' : `stopped${fu?.stopped_reason ? ' (' + fu.stopped_reason + ')' : ''}`
    });
  }));

  // --- scheduler control ---
  app.get(`${r}/followups`, agentAuth, wrap(async (req, res) => {
    const filter: any = {};
    if (req.query.active === 'true') filter.active = true;
    if (req.query.active === 'false') filter.active = false;
    const rows = await FollowUpModel.find(filter).sort({ updated_at: -1 }).limit(50).lean();
    res.json(rows.map((f: any) => ({
      student: f.student_name, student_id: f.student_id, active: f.active, messages_sent: f.messages_sent,
      last_sent_at: f.last_sent_at, next_run_at: f.active ? f.next_run_at : null, stopped_reason: f.stopped_reason
    })));
  }));

  app.post(`${r}/students/:ref/followup/start`, agentAuth, wrap(async (req, res) => {
    const s = await resolveStudent(req.params.ref);
    if (STOP_STATUSES.includes(s.status)) throw new HttpError(409, `${s.full_name} is "${s.status}". Set the status to active first.`);
    await startFollowUp(s);
    res.json({ message: `Scheduler started for ${s.full_name}. First message goes out within a minute.` });
  }));

  app.post(`${r}/students/:ref/followup/stop`, agentAuth, wrap(async (req, res) => {
    const s = await resolveStudent(req.params.ref);
    await stopFollowUp(s.id, 'stopped_by_admin');
    res.json({ message: `Scheduler stopped for ${s.full_name}.` });
  }));

  // --- send a WhatsApp message right now (not through the scheduler) ---
  app.post(`${r}/students/:ref/whatsapp`, agentAuth, wrap(async (req, res) => {
    const s = await resolveStudent(req.params.ref);
    const text = typeof req.body?.message === 'string' ? req.body.message : undefined;
    if (text && text.length > 1500) throw new HttpError(400, 'Message too long (max 1500 chars).');
    const result = await sendManual(s, text);
    await logAudit(AGENT_ACTOR, 'WHATSAPP_SENT', 'Student', s.id, undefined, `${result.ok ? 'Sent' : 'FAILED'}: ${result.message.slice(0, 200)}`);
    if (!result.ok) throw new HttpError(502, `WhatsApp message to ${s.full_name} failed: ${result.error}`);
    res.json({ message: `WhatsApp message sent to ${s.full_name} (${s.phone}).`, text_sent: result.message });
  }));

  app.get(`${r}/whatsapp/status`, agentAuth, wrap(async (_req, res) => {
    res.json(await whatsappStatus());
  }));
}
