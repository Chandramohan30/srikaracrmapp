import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectMongoDB, getMongoStatus } from './src/server/db.js';
import {
  UserModel, CourseModel, TrainerModel, StudentModel,
  InstallmentModel, PaymentModel, LeaveModel, ScheduleModel,
  SettingsModel, AuditLogModel, CounterModel, RefreshTokenModel
} from './src/server/models.js';
import {
  hashPassword, verifyPassword, sha256,
  signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken,
  signReceiptLinkToken, verifyReceiptLinkToken, REFRESH_TTL_MS, ACCESS_TTL_MS
} from './src/server/auth.js';
import { buildReceiptPdf } from './src/server/receipt.js';
import { ACADEMY_UPI_ID } from './src/server/config.js';
import {
  round2, getMonthNamesFromDate, splitAmountIntoTwoInstallments, computeInstallmentStatus,
  getActualDue, getPayableNow, getDisplayDue
} from './src/server/finance.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const shortId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

/** Remove mongo internals before sending to the browser */
function clean<T = any>(doc: any): T {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.__v;
  delete obj.password_hash;
  return obj as T;
}
const cleanAll = (docs: any[]) => docs.map(d => clean(d));

/** Pick only whitelisted keys that are present in the body */
function pick(body: any, keys: string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) {
    if (body && body[k] !== undefined) out[k] = body[k];
  }
  return out;
}

const required = (body: any, keys: string[]) => {
  for (const k of keys) {
    if (body?.[k] === undefined || body?.[k] === null || String(body[k]).trim() === '') {
      throw new HttpError(400, `Missing required field: ${k}`);
    }
  }
};

/** Atomic sequence -> next unused code such as SRK-2026-001 / TRN-001 */
async function nextCode(
  counterKey: string,
  build: (n: number) => string,
  exists: (code: string) => Promise<boolean>
): Promise<string> {
  for (let i = 0; i < 1000; i++) {
    const c: any = await CounterModel.findOneAndUpdate(
      { key: counterKey },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const code = build(c.seq);
    if (!(await exists(code))) return code;
  }
  throw new HttpError(500, 'Could not generate a unique ID');
}

async function nextSeq(counterKey: string): Promise<number> {
  const c: any = await CounterModel.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return c.seq;
}

async function logAudit(
  actor: any,
  action: string,
  entity: string,
  entity_id: string,
  old_value?: string,
  new_value?: string
) {
  try {
    await AuditLogModel.create({
      id: `aud-${shortId()}`,
      user_id: actor.id,
      user_name: actor.name,
      user_role: actor.role,
      action,
      entity,
      entity_id,
      old_value,
      new_value
    });
  } catch (e: any) {
    console.warn('[Audit] failed to write log:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Financial recalculation engine (server side, single source of truth)
// ---------------------------------------------------------------------------
async function recalcStudent(studentId: string) {
  const student: any = await StudentModel.findOne({ id: studentId });
  if (!student) return;

  const insts: any[] = await InstallmentModel.find({ student_id: studentId });
  const payments: any[] = await PaymentModel.find({ student_id: studentId, payment_status: 'success' });

  // 1. installments
  for (const inst of insts) {
    const paid = round2(
      payments.filter(p => p.installment_id === inst.id).reduce((s, p) => s + p.amount, 0)
    );
    inst.paid_amount = paid;
    // Agreed "pay now" amount is finished once the student has paid it
    if (inst.pay_now_amount && paid >= inst.pay_now_amount) inst.pay_now_amount = undefined;
    inst.due_amount = getDisplayDue(inst);
    inst.status = computeInstallmentStatus(inst.installment_amount, paid, inst.due_date);
    await inst.save();
  }

  // 2. student totals
  const totalCourse = insts.length > 0
    ? round2(insts.reduce((s, i) => s + i.installment_amount, 0))
    : student.total_course_amount;
  const totalPaid = round2(payments.reduce((s, p) => s + p.amount, 0));
  const totalOutstanding = Math.max(0, round2(totalCourse - totalPaid));

  const hasUnpaidDue = insts.some(i => i.due_amount > 0 && i.status === 'overdue');
  const hasPartiallyPaid = insts.some(i => i.status === 'partially_paid');

  let payment_status: string = 'not_paid';
  if (totalPaid >= totalCourse && totalCourse > 0) payment_status = 'fully_paid';
  else if (hasUnpaidDue) payment_status = 'has_due';
  else if (totalPaid > 0 || hasPartiallyPaid) payment_status = 'partially_paid';

  student.total_course_amount = totalCourse;
  student.total_paid = totalPaid;
  student.total_outstanding = totalOutstanding;
  student.payment_status = payment_status;
  await student.save();
}

async function recalcTrainer(trainerId?: string) {
  if (!trainerId) return;
  const count = await StudentModel.countDocuments({
    trainer_id: trainerId,
    status: { $nin: ['dropped', 'cancelled'] }
  });
  await TrainerModel.updateOne({ id: trainerId }, { assigned_students_count: count });
}

/** Installments that just crossed their due date become "overdue" */
async function refreshOverdue() {
  const todayStr = new Date().toISOString().split('T')[0];
  const candidates: any[] = await InstallmentModel.find({
    status: 'pending',
    due_amount: { $gt: 0 },
    due_date: { $lte: todayStr }
  }).select('student_id');
  const studentIds = [...new Set(candidates.map(c => c.student_id))];
  for (const sid of studentIds) await recalcStudent(sid);
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
type AuthedRequest = Request & { user?: any };

async function authenticate(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const decoded = token ? verifyAccessToken(token) : null;
    if (!decoded) throw new HttpError(401, 'Access token expired or invalid.');
    const user: any = await UserModel.findOne({ id: decoded.uid }).lean();
    if (!user || user.status === 'inactive') {
      throw new HttpError(401, 'Account not found or inactive.');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

const allow = (...roles: string[]) => (req: AuthedRequest, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, `Unauthorized: this action is restricted to ${roles.join(' / ')}.`));
  }
  next();
};

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<any>) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

// ---------------------------------------------------------------------------
// Payment proof + receipts
// ---------------------------------------------------------------------------
const MAX_PROOF_BYTES = 3 * 1024 * 1024;

/** Validates the uploaded screenshot (data URL) - throws if missing / not an image / too big */
function parseProofImage(input: any): { dataUrl: string; base64: string } {
  if (typeof input !== 'string' || !input) {
    throw new HttpError(400, 'Payment screenshot is required. Upload the screenshot of your UPI payment to continue.');
  }
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(input);
  if (!m) throw new HttpError(400, 'Screenshot must be a PNG, JPG or WEBP image.');
  const bytes = Math.floor((m[2].length * 3) / 4);
  if (bytes < 2000) throw new HttpError(400, 'Screenshot looks empty. Please upload the real payment screenshot.');
  if (bytes > MAX_PROOF_BYTES) throw new HttpError(413, 'Screenshot is too large (max 3 MB).');
  return { dataUrl: input, base64: m[2] };
}

async function renderReceipt(paymentId: string): Promise<{ pdf: Buffer; filename: string }> {
  const payment: any = await PaymentModel.findOne({ id: paymentId }).lean();
  if (!payment) throw new HttpError(404, 'Payment not found');
  const [student, installment, settings]: any[] = await Promise.all([
    StudentModel.findOne({ id: payment.student_id }).lean(),
    InstallmentModel.findOne({ id: payment.installment_id }).lean(),
    SettingsModel.findOne({ id: 'default_settings' }).lean()
  ]);
  const s = settings || {};

  let instPaid: number | undefined;
  let instBalance: number | undefined;
  if (installment) {
    const paidRows: any[] = await PaymentModel.find({
      installment_id: installment.id, payment_status: 'success'
    }).select('amount').lean();
    instPaid = round2(paidRows.reduce((t, p) => t + p.amount, 0));
    instBalance = Math.max(0, round2(installment.installment_amount - instPaid));
  }

  const label = installment
    ? `${installment.name || `Installment ${installment.installment_number}`} (${installment.month})`
    : payment.installment_month;

  const pdf = await buildReceiptPdf({
    receipt_number: payment.receipt_number,
    payment_date: payment.payment_date || payment.created_at,
    student_name: payment.student_name,
    student_code: payment.student_code,
    student_email: student?.email,
    student_phone: student?.phone,
    course_name: payment.course_name,
    installment_label: label,
    amount: payment.amount,
    transaction_id: payment.transaction_id,
    payment_method: payment.payment_method,
    gateway: payment.gateway,
    installment_amount: installment?.installment_amount,
    installment_paid: instPaid,
    installment_balance: instBalance,
    academy: {
      name: s.academyName || 'Srikara Training & Placement Academy',
      address: s.address, phone: s.academyPhone, email: s.academyEmail,
      website: s.website, gstin: s.gstin
    }
  });
  return { pdf, filename: `${payment.receipt_number}.pdf` };
}

function sendPdf(res: Response, pdf: Buffer, filename: string, inline = false) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Length', String(pdf.length));
  res.end(pdf);
}

// ---------------------------------------------------------------------------
// Token issuing
// ---------------------------------------------------------------------------
async function issueTokens(userId: string) {
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(userId, jti);
  await RefreshTokenModel.create({
    jti,
    user_id: userId,
    token_hash: sha256(refreshToken),
    expires_at: new Date(Date.now() + REFRESH_TTL_MS)
  });
  return {
    accessToken: signAccessToken(userId),
    refreshToken,
    expiresIn: Math.floor(ACCESS_TTL_MS / 1000)
  };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
async function startServer() {
  const app = express();
  // 6mb: payment screenshots are sent as (client-compressed) base64 images
  app.use(express.json({ limit: '6mb' }));

  // Connect to MongoDB Atlas
  const mongoStatus = await connectMongoDB();

  // --- HEALTH & DATABASE STATUS (public) ---
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Srikara CRM Server',
      database: getMongoStatus(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/db/status', (_req: Request, res: Response) => {
    res.json(getMongoStatus());
  });

  // Every other API route needs a live database connection
  app.use('/api', async (_req: Request, res: Response, next: NextFunction) => {
    if (getMongoStatus().status !== 'connected') {
      await connectMongoDB(); // try to (re)connect once
    }
    const st = getMongoStatus();
    if (st.status !== 'connected') {
      return res.status(503).json({
        error: `Database is not connected${st.error ? `: ${st.error}` : ''}. Check MONGODB_URI and Atlas Network Access (IP allow-list).`
      });
    }
    next();
  });

  // --- AUTHENTICATION ---
  app.post('/api/auth/login', wrap(async (req, res) => {
    const { role, email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, 'Email and password are required.');

    const cleanEmail = String(email).toLowerCase().trim();
    const query: any = { email: cleanEmail };
    if (role) query.role = role;

    const user: any = await UserModel.findOne(query).select('+password_hash');
    if (!user) {
      throw new HttpError(401, `Invalid credentials or no ${role || ''} account found for "${email}".`.replace('  ', ' '));
    }
    if (user.status === 'inactive') {
      throw new HttpError(403, 'This account is inactive. Please contact the academy admin.');
    }

    // Student / Trainer password = their Student ID / Trainer ID (not case sensitive)
    const supplied = user.role === 'admin'
      ? String(password)
      : String(password).trim().toUpperCase();

    const ok = await verifyPassword(supplied, user.password_hash);
    if (!ok) {
      throw new HttpError(
        401,
        user.role === 'admin'
          ? 'Incorrect password.'
          : `Incorrect password. Use your ${user.role === 'student' ? 'Student ID' : 'Trainer ID'} as the password.`
      );
    }

    const tokens = await issueTokens(user.id);
    res.json({ success: true, ...tokens, user: clean(user) });
  }));

  // Exchange a valid refresh token for a NEW access + refresh token (rotation).
  // Re-using an already-rotated refresh token revokes every session of that user.
  app.post('/api/auth/refresh', wrap(async (req, res) => {
    const supplied = String(req.body?.refreshToken || '');
    const decoded = supplied ? verifyRefreshToken(supplied) : null;
    if (!decoded) throw new HttpError(401, 'Refresh token invalid or expired. Please sign in again.');

    const record: any = await RefreshTokenModel.findOne({ jti: decoded.jti });
    if (!record || record.token_hash !== sha256(supplied)) {
      throw new HttpError(401, 'Refresh token not recognised. Please sign in again.');
    }
    if (record.revoked) {
      // token theft / replay detected -> kill all sessions of this user
      await RefreshTokenModel.updateMany({ user_id: record.user_id, revoked: false }, { revoked: true });
      throw new HttpError(401, 'Session was revoked. Please sign in again.');
    }

    const user: any = await UserModel.findOne({ id: record.user_id }).lean();
    if (!user || user.status === 'inactive') {
      await RefreshTokenModel.updateMany({ user_id: record.user_id, revoked: false }, { revoked: true });
      throw new HttpError(401, 'Account not found or inactive.');
    }

    const tokens = await issueTokens(user.id);
    record.revoked = true;
    record.replaced_by = verifyRefreshToken(tokens.refreshToken)?.jti;
    await record.save();
    res.json({ success: true, ...tokens });
  }));

  // Revoke the refresh token (this device). Always succeeds so the UI can log out.
  app.post('/api/auth/logout', wrap(async (req, res) => {
    const decoded = verifyRefreshToken(String(req.body?.refreshToken || ''));
    if (decoded) await RefreshTokenModel.updateOne({ jti: decoded.jti }, { revoked: true });
    res.json({ success: true });
  }));

  // Revoke every session of the signed-in user (all devices)
  app.post('/api/auth/logout-all', authenticate, wrap(async (req, res) => {
    await RefreshTokenModel.updateMany({ user_id: req.user.id, revoked: false }, { revoked: true });
    res.json({ success: true });
  }));

  app.get('/api/auth/me', authenticate, wrap(async (req, res) => {
    res.json({ user: clean(req.user) });
  }));

  // --- BOOTSTRAP: everything the logged-in role is allowed to see ---
  app.get('/api/bootstrap', authenticate, wrap(async (req, res) => {
    const user = req.user;
    await refreshOverdue();

    let settings: any = await SettingsModel.findOne({ id: 'default_settings' }).lean();
    if (!settings) {
      settings = (await SettingsModel.create({ id: 'default_settings' })).toObject();
    }

    const sort = { created_at: -1 } as any;
    const courses = await CourseModel.find().sort(sort).lean();
    const trainers = await TrainerModel.find().sort(sort).lean();

    let students: any[], installments: any[], payments: any[], leaves: any[], schedules: any[];
    let auditLogs: any[] = [];

    if (user.role === 'admin') {
      students = await StudentModel.find().sort(sort).lean();
      installments = await InstallmentModel.find().sort({ student_id: 1, installment_number: 1, sub_number: 1 }).lean();
      payments = await PaymentModel.find().sort(sort).lean();
      leaves = await LeaveModel.find().sort(sort).lean();
      schedules = await ScheduleModel.find().sort({ class_date: 1, start_time: 1 }).lean();
      auditLogs = await AuditLogModel.find().sort(sort).limit(200).lean();
    } else if (user.role === 'trainer') {
      const trainerId = user.trainer_id;
      students = await StudentModel.find({ trainer_id: trainerId }).sort(sort).lean();
      const ids = students.map(s => s.id);
      installments = await InstallmentModel.find({ student_id: { $in: ids } }).sort({ student_id: 1, installment_number: 1, sub_number: 1 }).lean();
      payments = await PaymentModel.find({ student_id: { $in: ids } }).sort(sort).lean();
      leaves = await LeaveModel.find({ trainer_id: trainerId }).sort(sort).lean();
      schedules = await ScheduleModel.find({ trainer_id: trainerId }).sort({ class_date: 1, start_time: 1 }).lean();
    } else {
      const sid = user.student_id;
      students = await StudentModel.find({ id: sid }).lean();
      installments = await InstallmentModel.find({ student_id: sid }).sort({ installment_number: 1, sub_number: 1 }).lean();
      payments = await PaymentModel.find({ student_id: sid }).sort(sort).lean();
      leaves = await LeaveModel.find({ student_id: sid }).sort(sort).lean();
      schedules = await ScheduleModel.find({ student_id: sid }).sort({ class_date: 1, start_time: 1 }).lean();
    }

    res.json({
      users: [clean(user)],
      courses: cleanAll(courses),
      trainers: cleanAll(trainers),
      students: cleanAll(students),
      installments: cleanAll(installments),
      payments: cleanAll(payments),
      leaves: cleanAll(leaves),
      schedules: cleanAll(schedules),
      auditLogs: cleanAll(auditLogs),
      settings: clean(settings)
    });
  }));

  // --- COURSES ---
  app.post('/api/courses', authenticate, allow('admin'), wrap(async (req, res) => {
    required(req.body, ['course_code', 'course_name', 'duration']);
    const base_price = Number(req.body.base_price);
    if (isNaN(base_price) || base_price < 0) throw new HttpError(400, 'Invalid base price.');

    const course = await CourseModel.create({
      id: `crs-${shortId()}`,
      course_code: String(req.body.course_code).trim().toUpperCase(),
      course_name: String(req.body.course_name).trim(),
      description: req.body.description || '',
      duration: req.body.duration,
      base_price,
      status: req.body.status || 'active'
    });
    await logAudit(req.user, 'CREATE_COURSE', 'Course', course.id, undefined,
      `Created course: ${course.course_name} (₹${course.base_price})`);
    res.status(201).json(clean(course));
  }));

  app.put('/api/courses/:id', authenticate, allow('admin'), wrap(async (req, res) => {
    const course: any = await CourseModel.findOne({ id: req.params.id });
    if (!course) throw new HttpError(404, 'Course not found');
    const oldVal = `Price: ₹${course.base_price}, Status: ${course.status}`;
    const updates = pick(req.body, ['course_name', 'base_price', 'duration', 'description', 'status']);
    if (updates.base_price !== undefined) updates.base_price = Number(updates.base_price);
    Object.assign(course, updates);
    await course.save();
    await logAudit(req.user, 'UPDATE_COURSE', 'Course', course.id, oldVal,
      `Price: ₹${course.base_price}, Status: ${course.status}`);
    res.json(clean(course));
  }));

  // --- TRAINERS ---
  app.post('/api/trainers', authenticate, allow('admin'), wrap(async (req, res) => {
    required(req.body, ['name', 'email']);
    const email = String(req.body.email).toLowerCase().trim();
    if (await UserModel.findOne({ email })) {
      throw new HttpError(409, `A user with email ${email} already exists.`);
    }

    let trainerCode = String(req.body.trainer_code || '').trim().toUpperCase();
    if (trainerCode) {
      if (await TrainerModel.findOne({ trainer_code: trainerCode })) {
        throw new HttpError(409, `Trainer ID ${trainerCode} already exists.`);
      }
    } else {
      trainerCode = await nextCode(
        'trainer',
        n => `TRN-${String(n).padStart(3, '0')}`,
        async c => !!(await TrainerModel.findOne({ trainer_code: c }))
      );
    }

    const trainerId = `trn-${shortId()}`;
    const userId = `usr-trn-${shortId()}`;
    const status = req.body.status || 'active';

    await UserModel.create({
      id: userId,
      name: req.body.name,
      email,
      phone: req.body.phone || '',
      role: 'trainer',
      trainer_id: trainerId,
      status,
      // Trainer logs in with email + Trainer ID as password
      password_hash: await hashPassword(trainerCode)
    });

    try {
      const trainer = await TrainerModel.create({
        id: trainerId,
        user_id: userId,
        trainer_code: trainerCode,
        name: req.body.name,
        email,
        phone: req.body.phone || '',
        specialization: req.body.specialization || '',
        experience: req.body.experience || '',
        joining_date: req.body.joining_date || '',
        status,
        skills: Array.isArray(req.body.skills) ? req.body.skills : [],
        profile_image: req.body.profile_image || '',
        assigned_students_count: 0
      });
      await logAudit(req.user, 'CREATE_TRAINER', 'Trainer', trainer.id, undefined,
        `Onboarded trainer: ${trainer.name} (${trainer.trainer_code})`);
      res.status(201).json(clean(trainer));
    } catch (err) {
      await UserModel.deleteOne({ id: userId }); // rollback
      throw err;
    }
  }));

  app.put('/api/trainers/:id', authenticate, allow('admin'), wrap(async (req, res) => {
    const trainer: any = await TrainerModel.findOne({ id: req.params.id });
    if (!trainer) throw new HttpError(404, 'Trainer not found');
    const oldVal = `${trainer.name} - ${trainer.specialization}`;
    const updates = pick(req.body, [
      'name', 'email', 'phone', 'specialization', 'experience',
      'joining_date', 'status', 'skills', 'profile_image'
    ]);
    if (updates.email) {
      updates.email = String(updates.email).toLowerCase().trim();
      const clash = await UserModel.findOne({ email: updates.email, id: { $ne: trainer.user_id } });
      if (clash) throw new HttpError(409, `A user with email ${updates.email} already exists.`);
    }
    Object.assign(trainer, updates);
    await trainer.save();

    const userUpdates: any = {};
    if (updates.name) userUpdates.name = updates.name;
    if (updates.email) userUpdates.email = updates.email;
    if (updates.phone !== undefined) userUpdates.phone = updates.phone;
    if (updates.status) userUpdates.status = updates.status;
    if (Object.keys(userUpdates).length) await UserModel.updateOne({ id: trainer.user_id }, userUpdates);

    await logAudit(req.user, 'UPDATE_TRAINER', 'Trainer', trainer.id, oldVal,
      `${trainer.name} - ${trainer.specialization}`);
    res.json(clean(trainer));
  }));

  // --- STUDENTS & ONBOARDING ---
  app.post('/api/students', authenticate, allow('admin'), wrap(async (req, res) => {
    const d = req.body || {};
    required(d, ['first_name', 'last_name', 'email', 'phone', 'course_id', 'trainer_id', 'joining_date']);

    const course: any = await CourseModel.findOne({ id: d.course_id });
    if (!course) throw new HttpError(404, 'Course not found');
    const trainer: any = await TrainerModel.findOne({ id: d.trainer_id });
    if (!trainer) throw new HttpError(404, 'Trainer not found');

    const email = String(d.email).toLowerCase().trim();
    if (await UserModel.findOne({ email })) {
      throw new HttpError(409, `A user with email ${email} already exists.`);
    }

    const year = new Date().getFullYear();
    const studentCode = await nextCode(
      `student-${year}`,
      n => `SRK-${year}-${String(n).padStart(3, '0')}`,
      async c => !!(await StudentModel.findOne({ student_code: c }))
    );

    const studentId = `std-${shortId()}`;
    const userId = `usr-std-${shortId()}`;
    const fullName = `${d.first_name} ${d.last_name}`.trim();

    let completionDate = d.expected_completion_date;
    if (!completionDate) {
      const dt = new Date(d.joining_date);
      dt.setMonth(dt.getMonth() + 5);
      completionDate = dt.toISOString().split('T')[0];
    }

    await UserModel.create({
      id: userId,
      name: fullName,
      email,
      phone: d.phone,
      role: 'student',
      student_id: studentId,
      status: 'active',
      // Student logs in with email + Student ID as password
      password_hash: await hashPassword(studentCode)
    });

    try {
      await StudentModel.create({
        id: studentId,
        student_code: studentCode,
        user_id: userId,
        first_name: d.first_name,
        last_name: d.last_name,
        full_name: fullName,
        email,
        phone: d.phone,
        alternate_phone: d.alternate_phone,
        date_of_birth: d.date_of_birth,
        gender: d.gender,
        address: d.address || '',
        city: d.city || '',
        state: d.state || '',
        qualification: d.qualification || '',
        college: d.college,
        passing_year: d.passing_year,
        course_id: course.id,
        course_name: course.course_name,
        trainer_id: trainer.id,
        trainer_name: trainer.name,
        joining_date: d.joining_date,
        expected_completion_date: completionDate,
        status: 'active',
        payment_status: 'not_paid',
        total_course_amount: course.base_price,
        total_paid: 0,
        total_outstanding: course.base_price
      });

      const amounts = splitAmountIntoTwoInstallments(course.base_price);
      const months = getMonthNamesFromDate(d.joining_date, 2);
      const installments = await InstallmentModel.insertMany(
        amounts.map((amt, i) => ({
          id: `inst-${shortId()}`,
          student_id: studentId,
          student_name: fullName,
          student_code: studentCode,
          course_name: course.course_name,
          installment_number: i + 1,
          name: `Installment ${i + 1}`,
          month: months[i].month,
          installment_amount: amt,
          paid_amount: 0,
          due_amount: amt,
          due_date: months[i].dueDate,
          status: 'pending'
        }))
      );

      await logAudit(req.user, 'ONBOARD_STUDENT', 'Student', studentId, undefined,
        `Onboarded ${fullName} (${studentCode}) for ${course.course_name} (₹${course.base_price}). 2 installments created: ₹${amounts[0]}, ₹${amounts[1]}. Assigned to ${trainer.name}.`);

      await recalcStudent(studentId);
      await recalcTrainer(trainer.id);

      const fresh = await StudentModel.findOne({ id: studentId });
      res.status(201).json({
        student: clean(fresh),
        installments: cleanAll(installments)
      });
    } catch (err) {
      // rollback partial onboarding
      await InstallmentModel.deleteMany({ student_id: studentId });
      await StudentModel.deleteOne({ id: studentId });
      await UserModel.deleteOne({ id: userId });
      throw err;
    }
  }));

  app.put('/api/students/:id', authenticate, allow('admin'), wrap(async (req, res) => {
    const student: any = await StudentModel.findOne({ id: req.params.id });
    if (!student) throw new HttpError(404, 'Student not found');

    const oldVal = `Status: ${student.status}, Trainer: ${student.trainer_name}`;
    const oldTrainerId = student.trainer_id;

    const updates = pick(req.body, [
      'first_name', 'last_name', 'email', 'phone', 'alternate_phone', 'date_of_birth',
      'gender', 'address', 'city', 'state', 'qualification', 'college', 'passing_year',
      'trainer_id', 'joining_date', 'expected_completion_date', 'status'
    ]);

    if (updates.email) {
      updates.email = String(updates.email).toLowerCase().trim();
      const clash = await UserModel.findOne({ email: updates.email, id: { $ne: student.user_id } });
      if (clash) throw new HttpError(409, `A user with email ${updates.email} already exists.`);
    }

    if (updates.trainer_id && updates.trainer_id !== student.trainer_id) {
      const trainer: any = await TrainerModel.findOne({ id: updates.trainer_id });
      if (!trainer) throw new HttpError(404, 'Trainer not found');
      updates.trainer_name = trainer.name;
    }

    Object.assign(student, updates);
    student.full_name = `${student.first_name} ${student.last_name}`.trim();
    await student.save();

    // Keep the login account in sync
    await UserModel.updateOne({ id: student.user_id }, {
      name: student.full_name,
      email: student.email,
      phone: student.phone,
      status: ['dropped', 'cancelled'].includes(student.status) ? 'inactive' : 'active'
    });

    if (updates.first_name || updates.last_name) {
      await InstallmentModel.updateMany({ student_id: student.id }, { student_name: student.full_name });
    }

    await logAudit(req.user, 'UPDATE_STUDENT', 'Student', student.id, oldVal,
      `Status: ${student.status}, Trainer: ${student.trainer_name}`);

    await recalcStudent(student.id);
    await recalcTrainer(oldTrainerId);
    await recalcTrainer(student.trainer_id);

    res.json(clean(await StudentModel.findOne({ id: student.id })));
  }));

  // --- INSTALLMENTS ---
  app.post('/api/installments', authenticate, allow('admin'), wrap(async (req, res) => {
    const { student_id, amount, month, due_date, notes, name } = req.body || {};
    required(req.body, ['student_id', 'amount', 'month', 'due_date']);
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) throw new HttpError(400, 'Installment amount must be greater than zero.');

    const student: any = await StudentModel.findOne({ id: student_id });
    if (!student) throw new HttpError(404, 'Student not found');

    const count = await InstallmentModel.countDocuments({ student_id });
    const inst = await InstallmentModel.create({
      id: `inst-m-${shortId()}`,
      student_id: student.id,
      student_name: student.full_name,
      student_code: student.student_code,
      course_name: student.course_name,
      installment_number: count + 1,
      name: name || `Manual Installment ${count + 1}`,
      month,
      installment_amount: amt,
      paid_amount: 0,
      due_amount: amt,
      due_date,
      status: 'pending',
      is_manual: true,
      notes
    });

    await logAudit(req.user, 'ADD_MANUAL_INSTALLMENT', 'Installment', inst.id, undefined,
      `Admin added manual installment for ${student.full_name}: ₹${amt} for ${month}. Notes: ${notes || '-'}`);
    await recalcStudent(student.id);
    res.status(201).json(clean(await InstallmentModel.findOne({ id: inst.id })));
  }));

  // Admin Update Installment
  // Example: installment is ₹10,000 and the student says "I will pay ₹4,000 now".
  // Admin sets pay_now = 4000 -> the SAME installment immediately shows ₹6,000 due.
  // Nothing moves to the next installment and the total course fee is unchanged.
  app.put('/api/installments/:id', authenticate, allow('admin'), wrap(async (req, res) => {
    const inst: any = await InstallmentModel.findOne({ id: req.params.id });
    if (!inst) throw new HttpError(404, 'Installment not found');

    const oldVal = `Amount: ₹${inst.installment_amount}, Pay now: ₹${inst.pay_now_amount ?? '-'}, Month: ${inst.month}, Due Date: ${inst.due_date}`;
    const { installment_amount, pay_now, month, due_date, notes } = req.body || {};

    if (installment_amount !== undefined) {
      const amt = round2(Number(installment_amount));
      if (isNaN(amt) || amt < 0) throw new HttpError(400, 'Invalid installment amount.');
      if (amt < inst.paid_amount) {
        throw new HttpError(400, `Cannot set installment amount less than already paid amount (₹${inst.paid_amount})`);
      }
      inst.installment_amount = amt;
    }

    if (pay_now !== undefined) {
      const actualDue = getActualDue(inst);
      if (pay_now === null || pay_now === '') {
        inst.pay_now_amount = undefined;
      } else {
        const pn = round2(Number(pay_now));
        if (isNaN(pn) || pn <= 0) throw new HttpError(400, 'Amount to pay now must be greater than zero.');
        if (pn > actualDue + 0.01) {
          throw new HttpError(400, `Amount to pay now (₹${pn}) cannot be more than the installment due (₹${actualDue}).`);
        }
        // Paying the full due = no special arrangement
        inst.pay_now_amount = pn >= actualDue - 0.01 ? undefined : round2(inst.paid_amount + pn);
      }
    } else if (inst.pay_now_amount && inst.pay_now_amount > inst.installment_amount) {
      inst.pay_now_amount = undefined;
    }

    inst.due_amount = getDisplayDue(inst);
    if (month !== undefined) inst.month = month;
    if (due_date !== undefined) inst.due_date = due_date;
    if (notes !== undefined) inst.notes = notes;
    await inst.save();

    await logAudit(req.user, 'UPDATE_INSTALLMENT', 'Installment', inst.id, oldVal,
      `Amount: ₹${inst.installment_amount}, Pay now (cumulative): ₹${inst.pay_now_amount ?? '-'}, Due shown: ₹${inst.due_amount}, Month: ${inst.month}, Due Date: ${inst.due_date}`);
    await recalcStudent(inst.student_id);
    res.json(clean(await InstallmentModel.findOne({ id: inst.id })));
  }));

  // Settle a leftover balance of an installment.
  // Example: Installment 1 is ₹17,500, student paid ₹17,000, ₹500 is left. Admin can either
  //   - "next":  add the ₹500 to the next installment, or
  //   - "sub":   create a sub-installment (Installment 1.1) of ₹500 under Installment 1.
  // Either way the student's total course fee stays exactly the same.
  app.post('/api/installments/:id/settle-balance', authenticate, allow('admin'), wrap(async (req, res) => {
    const inst: any = await InstallmentModel.findOne({ id: req.params.id });
    if (!inst) throw new HttpError(404, 'Installment not found');

    const { mode, amount, due_date, month, notes } = req.body || {};
    if (!['next', 'sub'].includes(mode)) throw new HttpError(400, "mode must be 'next' or 'sub'.");

    const actualDue = getActualDue(inst);
    if (actualDue <= 0.01) throw new HttpError(400, 'This installment has no balance left to settle.');
    const amt = amount === undefined || amount === '' ? actualDue : round2(Number(amount));
    if (isNaN(amt) || amt <= 0) throw new HttpError(400, 'Balance amount must be greater than zero.');
    if (amt > actualDue + 0.01) throw new HttpError(400, `Balance amount cannot be more than the remaining due (₹${actualDue}).`);

    const label = (i: any) => i.name || `Installment ${i.installment_number}`;
    const parentLabel = label(inst);
    let summary = '';

    if (mode === 'next') {
      const later: any[] = await InstallmentModel.find({
        student_id: inst.student_id,
        installment_number: { $gt: inst.installment_number }
      }).sort({ installment_number: 1, sub_number: 1 });
      const target = later.find(i => getActualDue(i) > 0.01) || later[0];

      if (target) {
        target.installment_amount = round2(target.installment_amount + amt);
        target.due_amount = getDisplayDue(target);
        target.notes = `${target.notes ? target.notes + ' | ' : ''}+₹${amt} balance from ${parentLabel}`;
        await target.save();
        summary = `₹${amt} balance of ${parentLabel} added to ${label(target)} (${target.month}).`;
      } else {
        const nextMonth = getMonthNamesFromDate(inst.due_date, 2)[1];
        const count = await InstallmentModel.countDocuments({ student_id: inst.student_id });
        const created: any = await InstallmentModel.create({
          id: `inst-m-${shortId()}`,
          student_id: inst.student_id,
          student_name: inst.student_name,
          student_code: inst.student_code,
          course_name: inst.course_name,
          installment_number: count + 1,
          name: `Installment ${count + 1}`,
          month: nextMonth.month,
          installment_amount: amt,
          paid_amount: 0,
          due_amount: amt,
          due_date: nextMonth.dueDate,
          status: 'pending',
          is_manual: true,
          notes: `Balance of ₹${amt} from ${parentLabel}`
        });
        summary = `₹${amt} balance of ${parentLabel} moved to new ${label(created)} (${created.month}).`;
      }
    } else {
      const subCount = await InstallmentModel.countDocuments({
        student_id: inst.student_id,
        installment_number: inst.installment_number,
        sub_number: { $gt: 0 }
      });
      const subNo = subCount + 1;
      const parentId = inst.parent_installment_id || inst.id;
      const created: any = await InstallmentModel.create({
        id: `inst-s-${shortId()}`,
        student_id: inst.student_id,
        student_name: inst.student_name,
        student_code: inst.student_code,
        course_name: inst.course_name,
        installment_number: inst.installment_number,
        sub_number: subNo,
        parent_installment_id: parentId,
        name: `Installment ${inst.installment_number}.${subNo}`,
        month: month || inst.month,
        installment_amount: amt,
        paid_amount: 0,
        due_amount: amt,
        due_date: due_date || inst.due_date,
        status: 'pending',
        is_manual: true,
        notes: notes || `Balance of ₹${amt} from ${parentLabel}`
      });
      summary = `₹${amt} balance of ${parentLabel} split into sub-installment ${label(created)} (due ${created.due_date}).`;
    }

    // The original installment is reduced by the moved amount, so nothing is counted twice
    inst.installment_amount = round2(inst.installment_amount - amt);
    inst.pay_now_amount = undefined;
    inst.due_amount = getDisplayDue(inst);
    inst.notes = `${inst.notes ? inst.notes + ' | ' : ''}₹${amt} balance settled (${mode === 'sub' ? 'sub-installment' : 'next installment'})`;
    await inst.save();

    await logAudit(req.user, 'SETTLE_INSTALLMENT_BALANCE', 'Installment', inst.id, undefined, summary);
    await recalcStudent(inst.student_id);
    res.json({ message: summary });
  }));

  // --- PAYMENTS (manual UPI + screenshot) ---
  // Record Payment
  app.post('/api/payments', authenticate, allow('admin', 'student'), wrap(async (req, res) => {
    const actor = req.user;
    const { student_id, installment_id, utr, notes, proof_screenshot } = req.body || {};
    required(req.body, ['student_id', 'installment_id', 'amount']);
    const amount = Number(req.body.amount);
    if (isNaN(amount) || amount <= 0) throw new HttpError(400, 'Payment amount must be greater than zero');

    // Students may only pay for themselves
    if (actor.role === 'student' && actor.student_id !== student_id) {
      throw new HttpError(403, 'Unauthorized: you can only pay your own installments.');
    }

    const student: any = await StudentModel.findOne({ id: student_id });
    if (!student) throw new HttpError(404, 'Student not found');
    const installment: any = await InstallmentModel.findOne({ id: installment_id });
    if (!installment || installment.student_id !== student.id) {
      throw new HttpError(404, 'Installment not found');
    }

    // --- Payment proof is mandatory: no screenshot -> nothing is submitted ---
    const proof = parseProofImage(proof_screenshot);
    const proofHash = sha256(proof.base64);
    if (await PaymentModel.exists({ proof_hash: proofHash })) {
      throw new HttpError(409, 'This screenshot was already used for another payment. Please upload the screenshot of this payment.');
    }
    const utrClean = utr ? String(utr).trim() : '';
    if (utrClean) {
      if (!/^\d{12}$/.test(utrClean)) throw new HttpError(400, 'UPI reference (UTR) must be a 12-digit number.');
      if (await PaymentModel.exists({ transaction_id: utrClean })) {
        throw new HttpError(409, 'This UPI reference (UTR) was already used for another payment.');
      }
    }

    // Installments must be cleared in order: earlier installment's due must be paid first
    const earlierUnpaid: any = await InstallmentModel.findOne({
      student_id: student.id,
      installment_number: { $lt: installment.installment_number },
      $expr: { $gt: [{ $subtract: ['$installment_amount', '$paid_amount'] }, 0.01] }
    });
    if (earlierUnpaid) {
      throw new HttpError(400,
        `Please clear the due of ${earlierUnpaid.name || 'Installment ' + earlierUnpaid.installment_number} (₹${getActualDue(earlierUnpaid)}) before paying ${installment.name || 'Installment ' + installment.installment_number}.`);
    }

    const actualDue = getActualDue(installment);
    const payableNow = getPayableNow(installment);
    if (actualDue <= 0.01) throw new HttpError(400, 'This installment is already fully paid.');

    // Students pay exactly the amount agreed by admin (Admin only can change it)
    if (actor.role === 'student' && Math.abs(amount - payableNow) > 0.01) {
      throw new HttpError(403, `Unauthorized: amount to pay is fixed at ₹${payableNow}. Students cannot edit it; it is editable only by Admin.`);
    }
    if (amount > actualDue + 0.01) {
      throw new HttpError(400, `Payment amount (₹${amount}) cannot exceed outstanding installment due (₹${actualDue})`);
    }

    const year = new Date().getFullYear();
    const seq = await nextSeq(`receipt-${year}`);
    const receiptNumber = `SRK-RCP-${year}-${String(seq).padStart(3, '0')}`;
    const recordedBy = actor.role === 'admin' ? `${actor.name} (Admin)` : `${actor.name} (${actor.role.toUpperCase()})`;

    const payment = await PaymentModel.create({
      id: `pay-${shortId()}`,
      student_id: student.id,
      student_name: student.full_name,
      student_code: student.student_code,
      course_id: student.course_id,
      course_name: student.course_name,
      installment_id: installment.id,
      installment_month: installment.month,
      transaction_id: utrClean || `UPI-${shortId().toUpperCase()}`,
      amount: round2(amount),
      payment_method: 'upi',
      gateway: 'UPI (Screenshot Verified)',
      payment_status: 'success',
      has_proof: true,
      proof_screenshot: proof.dataUrl,
      proof_hash: proofHash,
      recorded_by: recordedBy,
      receipt_number: receiptNumber,
      notes: notes || `UPI payment to ${ACADEMY_UPI_ID} for ${installment.month}`
    });

    await logAudit(actor, 'RECORD_PAYMENT', 'Payment', payment.id, undefined,
      `Recorded ₹${payment.amount} for ${student.full_name} (${installment.month}). UPI, screenshot attached. Txn: ${payment.transaction_id}`);

    await recalcStudent(student.id);
    const out = clean(payment);
    delete out.proof_screenshot;
    delete out.proof_hash;
    res.status(201).json(out);
  }));

  // --- RECEIPTS (admin only) ---
  // Download the PDF (admin, Bearer token)
  app.get('/api/payments/:id/receipt', authenticate, allow('admin'), wrap(async (req, res) => {
    const { pdf, filename } = await renderReceipt(req.params.id);
    await logAudit(req.user, 'DOWNLOAD_RECEIPT', 'Payment', req.params.id, undefined, filename);
    sendPdf(res, pdf, filename);
  }));

  // Create a signed link (valid 30 days) that is placed in the WhatsApp / e-mail message
  app.post('/api/payments/:id/receipt-link', authenticate, allow('admin'), wrap(async (req, res) => {
    const exists = await PaymentModel.exists({ id: req.params.id });
    if (!exists) throw new HttpError(404, 'Payment not found');
    const token = signReceiptLinkToken(req.params.id);
    await logAudit(req.user, 'SHARE_RECEIPT', 'Payment', req.params.id, undefined, String(req.body?.channel || 'link'));
    res.json({ path: `/api/receipts/shared/${token}` });
  }));

  // Public (no login): opened from the link inside the WhatsApp / e-mail message.
  // Protected by the unguessable, expiring signature in the URL.
  app.get('/api/receipts/shared/:token', wrap(async (req, res) => {
    const decoded = verifyReceiptLinkToken(req.params.token);
    if (!decoded) throw new HttpError(410, 'This receipt link is invalid or has expired. Please ask the academy for a new one.');
    const { pdf, filename } = await renderReceipt(decoded.pid);
    sendPdf(res, pdf, filename, true);
  }));

  // Screenshot the student uploaded (admin only)
  app.get('/api/payments/:id/proof', authenticate, allow('admin'), wrap(async (req, res) => {
    const p: any = await PaymentModel.findOne({ id: req.params.id }).select('+proof_screenshot').lean();
    if (!p?.proof_screenshot) throw new HttpError(404, 'No screenshot stored for this payment.');
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(p.proof_screenshot);
    if (!m) throw new HttpError(404, 'Stored screenshot is invalid.');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(Buffer.from(m[2], 'base64'));
  }));

  // --- LEAVE MANAGEMENT ---
  app.post('/api/leaves', authenticate, allow('student'), wrap(async (req, res) => {
    required(req.body, ['from_date', 'to_date', 'reason']);
    const student: any = await StudentModel.findOne({ id: req.user.student_id });
    if (!student) throw new HttpError(404, 'Current user is not mapped to an active student record.');

    const from = new Date(req.body.from_date);
    const to = new Date(req.body.to_date);
    if (to < from) throw new HttpError(400, 'End date cannot be earlier than start date');
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;

    const leave = await LeaveModel.create({
      id: `lev-${shortId()}`,
      student_id: student.id,
      student_name: student.full_name,
      student_code: student.student_code,
      trainer_id: student.trainer_id,
      from_date: req.body.from_date,
      to_date: req.body.to_date,
      days,
      reason: req.body.reason,
      status: 'pending'
    });
    await logAudit(req.user, 'APPLY_LEAVE', 'LeaveApplication', leave.id, undefined,
      `${student.full_name} applied leave for ${days} day(s) from ${req.body.from_date} to ${req.body.to_date}`);
    res.status(201).json(clean(leave));
  }));

  const reviewLeave = (decision: 'approved' | 'rejected') =>
    wrap(async (req, res) => {
      const leave: any = await LeaveModel.findOne({ id: req.params.id });
      if (!leave) throw new HttpError(404, 'Leave application not found');
      if (leave.status !== 'pending') throw new HttpError(400, `This leave is already ${leave.status}.`);

      const remarks = (req.body?.remarks || '').trim() ||
        (decision === 'approved' ? 'Approved by Academy Admin' : 'Rejected by Academy Admin');

      leave.status = decision;
      leave.admin_remarks = remarks;
      leave.approved_by = `${req.user.name} (Admin)`;
      leave.approved_at = new Date();
      await leave.save();

      await logAudit(req.user, decision === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
        'LeaveApplication', leave.id, 'Status: PENDING',
        `Status: ${decision.toUpperCase()}. Remarks: ${remarks}`);
      res.json(clean(leave));
    });

  app.post('/api/leaves/:id/approve', authenticate, allow('admin'), reviewLeave('approved'));
  app.post('/api/leaves/:id/reject', authenticate, allow('admin'), reviewLeave('rejected'));

  // --- CLASS SCHEDULES ---
  app.post('/api/schedules', authenticate, allow('admin', 'trainer'), wrap(async (req, res) => {
    const d = req.body || {};
    required(d, ['student_id', 'trainer_id', 'title', 'topic', 'class_date', 'start_time', 'end_time']);

    if (req.user.role === 'trainer' && d.trainer_id !== req.user.trainer_id) {
      throw new HttpError(403, 'Unauthorized: Trainer can only configure schedule for assigned students');
    }

    const student: any = await StudentModel.findOne({ id: d.student_id });
    if (!student) throw new HttpError(404, 'Student not found');
    const trainer: any = await TrainerModel.findOne({ id: d.trainer_id });
    if (!trainer) throw new HttpError(404, 'Trainer not found');

    const schedule = await ScheduleModel.create({
      id: `sch-${shortId()}`,
      student_id: student.id,
      student_name: student.full_name,
      trainer_id: trainer.id,
      trainer_name: trainer.name,
      course_name: student.course_name,
      title: d.title,
      topic: d.topic,
      class_date: d.class_date,
      start_time: d.start_time,
      end_time: d.end_time,
      meeting_url: d.meeting_url || `https://meet.google.com/srk-${shortId().slice(0, 4)}-${shortId().slice(0, 3)}`,
      google_event_id: `gcal_${Date.now()}_${shortId().slice(0, 6)}`,
      google_calendar_synced: true,
      notes: d.notes,
      status: 'scheduled'
    });

    await logAudit(req.user, 'CREATE_SCHEDULE', 'ClassSchedule', schedule.id, undefined,
      `Scheduled class "${d.title}" for ${student.full_name} with ${trainer.name} on ${d.class_date} (${d.start_time} - ${d.end_time})`);
    res.status(201).json(clean(schedule));
  }));

  const loadOwnedSchedule = async (req: AuthedRequest) => {
    const schedule: any = await ScheduleModel.findOne({ id: req.params.id });
    if (!schedule) throw new HttpError(404, 'Schedule not found');
    if (req.user.role === 'trainer' && schedule.trainer_id !== req.user.trainer_id) {
      throw new HttpError(403, 'Unauthorized: Cannot modify other trainers schedule');
    }
    return schedule;
  };

  app.put('/api/schedules/:id', authenticate, allow('admin', 'trainer'), wrap(async (req, res) => {
    const schedule = await loadOwnedSchedule(req);
    Object.assign(schedule, pick(req.body, [
      'title', 'topic', 'class_date', 'start_time', 'end_time',
      'meeting_url', 'notes', 'status', 'google_calendar_synced'
    ]));
    await schedule.save();
    await logAudit(req.user, 'UPDATE_SCHEDULE', 'ClassSchedule', schedule.id, undefined,
      `Updated schedule: ${schedule.title} on ${schedule.class_date}`);
    res.json(clean(schedule));
  }));

  app.delete('/api/schedules/:id', authenticate, allow('admin', 'trainer'), wrap(async (req, res) => {
    const schedule = await loadOwnedSchedule(req);
    await ScheduleModel.deleteOne({ id: schedule.id });
    await logAudit(req.user, 'DELETE_SCHEDULE', 'ClassSchedule', schedule.id, schedule.title, 'DELETED');
    res.json({ success: true });
  }));

  // --- SETTINGS ---
  app.get('/api/settings', authenticate, wrap(async (_req, res) => {
    let settings: any = await SettingsModel.findOne({ id: 'default_settings' });
    if (!settings) settings = await SettingsModel.create({ id: 'default_settings' });
    res.json(clean(settings));
  }));

  app.put('/api/settings', authenticate, allow('admin'), wrap(async (req, res) => {
    let settings: any = await SettingsModel.findOne({ id: 'default_settings' });
    if (!settings) settings = new SettingsModel({ id: 'default_settings' });
    Object.assign(settings, pick(req.body, [
      'academyName', 'academyEmail', 'academyPhone', 'website',
      'address', 'gstin'
    ]));
    await settings.save();
    await logAudit(req.user, 'UPDATE_SETTINGS', 'Settings', 'app-settings', undefined, 'Updated CRM academy settings');
    res.json(clean(settings));
  }));

  // Unknown API route
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // --- API ERROR HANDLER ---
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
      return res.status(409).json({ error: `Duplicate ${field}: a record with this ${field} already exists.` });
    }
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[API Error]', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  // --- VITE MIDDLEWARE / STATIC FILES ---
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Vite middleware mode initialization fallback:', e);
    }
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Srikara CRM Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[MongoDB Atlas] Status: ${mongoStatus.status}`);
  });
}

// Start server
startServer().catch(err => {
  console.error('Fatal Server startup error:', err);
});

export default startServer;
