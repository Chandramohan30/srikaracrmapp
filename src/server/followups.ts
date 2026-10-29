/**
 * WhatsApp follow-up engine.
 *  - A student who is added to the CRM gets a FollowUp record -> scheduler messages them every
 *    FOLLOWUP_INTERVAL_MINUTES (default 5) asking them to join the course they selected.
 *  - Admin sets the student's status to inactive (or dropped / cancelled / on_hold / completed)
 *    -> the follow-up is stopped immediately and never picked up by the scheduler again.
 *  - Manual messages (from the AI agent) go through sendManual() and do not depend on the scheduler.
 */
import mongoose from 'mongoose';
import crypto from 'crypto';
import { StudentModel, CourseModel, FollowUpModel } from './models.js';
import { sendWhatsApp } from './whatsapp.js';
import { ACADEMY_UPI_ID } from './config.js';

/** Statuses that mean "do not message this student automatically". */
export const STOP_STATUSES = ['inactive', 'on_hold', 'dropped', 'cancelled', 'completed'];

const num = (v: string | undefined, d: number) => (v && !isNaN(Number(v)) ? Number(v) : d);
const intervalMs = () => num(process.env.FOLLOWUP_INTERVAL_MINUTES, 5) * 60_000;
const maxMessages = () => num(process.env.FOLLOWUP_MAX_MESSAGES, 6);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const shortId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 8);

/** Only message between FOLLOWUP_WINDOW_START and FOLLOWUP_WINDOW_END (hours, Asia/Kolkata). Set both to 0 / 24 to disable. */
function insideSendingWindow(): boolean {
  const start = num(process.env.FOLLOWUP_WINDOW_START, 9);
  const end = num(process.env.FOLLOWUP_WINDOW_END, 20);
  if (start <= 0 && end >= 24) return true;
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', hour12: false, timeZone: process.env.FOLLOWUP_TZ || 'Asia/Kolkata'
  }).format(new Date())) % 24;
  return hour >= start && hour < end;
}

// ---------------------------------------------------------------------------
// Message templates (rotated). Course / fee / duration come from what the student selected.
// ---------------------------------------------------------------------------
async function buildMessage(student: any, index: number): Promise<string> {
  const course: any = await CourseModel.findOne({ id: student.course_id }).lean();
  const name = student.first_name || student.full_name;
  const courseName = student.course_name;
  const duration = course?.duration ? ` (${course.duration})` : '';
  const fee = student.total_course_amount ? `₹${Number(student.total_course_amount).toLocaleString('en-IN')}` : '';
  const academy = 'Srikara Training & Placement Academy';

  const templates = [
    `Hi ${name}, thank you for choosing *${courseName}*${duration} at ${academy}! 🎓\nYour seat is reserved. Please confirm your joining so we can start your batch. Reply *YES* to confirm.`,
    `Hello ${name}, just a reminder from ${academy} 😊\nYou selected *${courseName}*${fee ? ` – course fee ${fee}` : ''}. Your trainer *${student.trainer_name}* is ready to start. Shall we fix your joining date?`,
    `Hi ${name}, seats for *${courseName}* are filling up. 🚀\nTo complete your admission you can pay the first installment by UPI: *${ACADEMY_UPI_ID}* and share the screenshot here.`,
    `Hi ${name}, do you have any doubts about *${courseName}* – syllabus, timings or placement support? Reply here and our team will help you right away.`,
    `Hello ${name}, we haven't heard from you yet about *${courseName}*. Are you still interested in joining ${academy}? Reply *YES* to continue or *NO* to stop these messages.`,
    `Hi ${name}, this is our last reminder for *${courseName}*. Whenever you are ready to join, just message us here. All the best! 🙏`
  ];
  return templates[index % templates.length];
}

// ---------------------------------------------------------------------------
// Start / stop / sync
// ---------------------------------------------------------------------------
export async function startFollowUp(student: any, opts: { immediate?: boolean } = {}) {
  if (STOP_STATUSES.includes(student.status)) return null;
  const existing: any = await FollowUpModel.findOne({ student_id: student.id });
  const nextRun = new Date(Date.now() + (opts.immediate === false ? intervalMs() : 0));
  if (existing) {
    existing.active = true;
    existing.stopped_reason = undefined;
    existing.stopped_at = undefined;
    existing.phone = student.phone;
    existing.student_name = student.full_name;
    if (existing.messages_sent >= maxMessages()) existing.messages_sent = 0; // fresh round after re-activation
    existing.next_run_at = nextRun;
    await existing.save();
    return existing;
  }
  return FollowUpModel.create({
    id: `fu-${shortId()}`,
    student_id: student.id,
    student_name: student.full_name,
    phone: student.phone,
    active: true,
    messages_sent: 0,
    next_run_at: nextRun,
    history: []
  });
}

export async function stopFollowUp(studentId: string, reason: string) {
  return FollowUpModel.findOneAndUpdate(
    { student_id: studentId },
    { active: false, stopped_reason: reason, stopped_at: new Date() },
    { returnDocument: 'after' }
  );
}

/** Call after any student create/update so the scheduler always matches the CRM status. */
export async function syncFollowUpWithStudent(student: any) {
  if (STOP_STATUSES.includes(student.status)) {
    await stopFollowUp(student.id, `status_${student.status}`);
  } else {
    const fu: any = await FollowUpModel.findOne({ student_id: student.id }).lean();
    // resume only when it was stopped because of a status; never resume "joined"/"max reached"
    if (!fu) await startFollowUp(student);
    else if (!fu.active && String(fu.stopped_reason || '').startsWith('status_')) await startFollowUp(student);
    else if (fu.active && fu.phone !== student.phone) await FollowUpModel.updateOne({ student_id: student.id }, { phone: student.phone });
  }
}

// ---------------------------------------------------------------------------
// Manual send (AI agent / admin) - works regardless of the scheduler
// ---------------------------------------------------------------------------
export async function sendManual(student: any, text?: string) {
  let fu: any = await FollowUpModel.findOne({ student_id: student.id });
  if (!fu) {
    // keep a history row even if the scheduler never ran for this student
    fu = await FollowUpModel.create({
      id: `fu-${shortId()}`, student_id: student.id, student_name: student.full_name,
      phone: student.phone, active: false, stopped_reason: 'manual_only', messages_sent: 0, history: []
    });
  }
  const message = text?.trim() || await buildMessage(student, fu?.messages_sent ?? 0);
  const result = await sendWhatsApp(student.phone, message);
  await FollowUpModel.updateOne(
    { student_id: student.id },
    {
      $push: { history: { $each: [{ at: new Date(), text: message, source: 'agent', ok: result.ok, error: result.error }], $slice: -50 } },
      ...(result.ok && !text ? { $inc: { messages_sent: 1 } } : {})
    }
  );
  return { ...result, message };
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------
let ticking = false;

export async function runFollowUpTick() {
  if (ticking || mongoose.connection.readyState !== 1) return;
  if (!insideSendingWindow()) return;
  ticking = true;
  try {
    const due: any[] = await FollowUpModel.find({ active: true, next_run_at: { $lte: new Date() } }).limit(50).lean();
    for (const fu of due) {
      // Claim the row first so two ticks can never send the same message twice
      const claimed: any = await FollowUpModel.findOneAndUpdate(
        { id: fu.id, active: true, next_run_at: { $lte: new Date() } },
        { next_run_at: new Date(Date.now() + intervalMs()) },
        { returnDocument: 'after' }
      );
      if (!claimed) continue;

      // Re-read the student NOW: if admin just made them inactive, stop instead of sending
      const student: any = await StudentModel.findOne({ id: fu.student_id }).lean();
      if (!student) { await stopFollowUp(fu.student_id, 'student_deleted'); continue; }
      if (STOP_STATUSES.includes(student.status)) { await stopFollowUp(student.id, `status_${student.status}`); continue; }
      if ((student.total_paid || 0) > 0) { await stopFollowUp(student.id, 'joined_paid'); continue; }
      if (claimed.messages_sent >= maxMessages()) { await stopFollowUp(student.id, 'max_messages_reached'); continue; }

      const text = await buildMessage(student, claimed.messages_sent);
      const result = await sendWhatsApp(student.phone, text);
      await FollowUpModel.updateOne({ id: fu.id }, {
        ...(result.ok ? { $inc: { messages_sent: 1 }, last_sent_at: new Date() } : {}),
        $push: { history: { $each: [{ at: new Date(), text, source: 'scheduler', ok: result.ok, error: result.error }], $slice: -50 } }
      });
      console.log(`[FollowUp] ${student.full_name} (${student.phone}) -> ${result.ok ? 'sent' : 'FAILED: ' + result.error}`);
      await sleep(3000 + Math.random() * 5000); // small human-like gap between different students
    }
  } catch (e: any) {
    console.error('[FollowUp] tick failed:', e.message);
  } finally {
    ticking = false;
  }
}

export function startFollowUpScheduler() {
  const everyMs = intervalMs();
  console.log(`[FollowUp] Scheduler running every ${everyMs / 60000} min (max ${maxMessages()} msgs/student)`);
  // Tick every minute; each student's own next_run_at decides if they are due (so new students start right away).
  setInterval(runFollowUpTick, 60_000);
  setTimeout(runFollowUpTick, 10_000);
}
