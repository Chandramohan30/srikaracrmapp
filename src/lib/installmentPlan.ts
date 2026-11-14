// Installment plan used by the onboarding wizard (Step 4).
//
// Rules
//  - The course fee is split equally into N planned installments (N from the dropdown, max MAX_INSTALLMENTS).
//  - If the admin lowers an installment (e.g. planned ₹20,000 -> ₹5,000), the balance (₹15,000) is
//    added automatically as a SUB-installment of that same installment (Installment 1.1) with its own
//    due date. The admin can split it further (1.2, 1.3 ...) and change every amount and date.
//  - The admin may add MANUAL installments, but only for money that is not yet planned:
//    the grand total can never go beyond the course fee, and must equal it to save.
//
// All money is handled in paise (integers) so totals never drift by a rupee/paisa.

import { splitAmountIntoInstallments, getMonthNamesFromDate, MAX_INSTALLMENTS } from '../server/finance';

export interface SubRow {
  amount: string;   // rupees, as typed
  due_date: string; // YYYY-MM-DD
}

export interface PlanRow {
  kind: 'auto' | 'manual';
  target: number;   // planned amount in paise for auto rows (0 for manual)
  amount: string;
  due_date: string;
  subs: SubRow[];
}

export const MAX_MANUAL_INSTALLMENTS = 6;
export const MAX_SUBS_PER_INSTALLMENT = 6;
export const SUB_DEFAULT_GAP_DAYS = 15;

export const toPaise = (v: string | number): number => Math.round((Number(v) || 0) * 100);
export const rupees = (paise: number): string => (paise / 100).toFixed(2);

export function addDays(date: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const clone = (plan: PlanRow[]): PlanRow[] => plan.map(r => ({ ...r, subs: r.subs.map(s => ({ ...s })) }));

export const subsPaise = (row: PlanRow) => row.subs.reduce((t, s) => t + toPaise(s.amount), 0);
export const rowTotalPaise = (row: PlanRow) => toPaise(row.amount) + subsPaise(row);
export const planTotalPaise = (plan: PlanRow[]) => plan.reduce((t, r) => t + rowTotalPaise(r), 0);

/** Equal split with monthly due dates from the joining date */
export function buildDefaultPlan(count: number, fee: number, joiningDate: string): PlanRow[] {
  const amounts = splitAmountIntoInstallments(fee, count);
  const months = getMonthNamesFromDate(joiningDate, amounts.length);
  return amounts.map((a, i) => ({
    kind: 'auto',
    target: toPaise(a),
    amount: a.toFixed(2),
    due_date: months[i].dueDate,
    subs: []
  }));
}

/**
 * Admin typed a new amount for a row.
 * For a planned row, whatever is left of the planned amount becomes / updates its sub-installment(s).
 */
export function setRowAmount(plan: PlanRow[], idx: number, value: string): PlanRow[] {
  const next = clone(plan);
  const row = next[idx];
  row.amount = value;
  if (row.kind !== 'auto') return next;

  const remainder = row.target - toPaise(value);
  if (remainder <= 0) {
    row.subs = [];
  } else if (row.subs.length === 0) {
    row.subs = [{ amount: rupees(remainder), due_date: addDays(row.due_date, SUB_DEFAULT_GAP_DAYS) }];
  } else if (row.subs.length === 1) {
    row.subs[0].amount = rupees(remainder);
  } else {
    const others = row.subs.slice(0, -1).reduce((t, s) => t + toPaise(s.amount), 0);
    const last = remainder - others;
    if (last > 0) row.subs[row.subs.length - 1].amount = rupees(last);
    else row.subs = [{ amount: rupees(remainder), due_date: row.subs[0].due_date }];
  }
  return next;
}

export function setRowDate(plan: PlanRow[], idx: number, value: string): PlanRow[] {
  const next = clone(plan);
  next[idx].due_date = value;
  return next;
}

export function setSubAmount(plan: PlanRow[], idx: number, k: number, value: string): PlanRow[] {
  const next = clone(plan);
  next[idx].subs[k].amount = value;
  return next;
}

export function setSubDate(plan: PlanRow[], idx: number, k: number, value: string): PlanRow[] {
  const next = clone(plan);
  next[idx].subs[k].due_date = value;
  return next;
}

/** Amount of a planned row that is not yet covered by the row + its subs (paise, can be negative) */
export const rowUnallocatedPaise = (row: PlanRow) => (row.kind === 'auto' ? row.target - rowTotalPaise(row) : 0);

export function canAddSub(row: PlanRow): boolean {
  if (row.kind !== 'auto' || row.subs.length >= MAX_SUBS_PER_INSTALLMENT) return false;
  return rowUnallocatedPaise(row) > 0 || row.subs.some(s => toPaise(s.amount) >= 2);
}

/** Adds a sub-installment: takes the uncovered balance, or else splits the last sub in two */
export function addSub(plan: PlanRow[], idx: number): PlanRow[] {
  const next = clone(plan);
  const row = next[idx];
  if (!canAddSub(row)) return plan;
  const lastDate = row.subs.length ? row.subs[row.subs.length - 1].due_date : row.due_date;
  const due = addDays(lastDate, SUB_DEFAULT_GAP_DAYS);
  const open = rowUnallocatedPaise(row);
  if (open > 0) {
    row.subs.push({ amount: rupees(open), due_date: due });
  } else {
    const last = row.subs[row.subs.length - 1];
    const lp = toPaise(last.amount);
    const half = Math.floor(lp / 2);
    last.amount = rupees(lp - half);
    row.subs.push({ amount: rupees(half), due_date: due });
  }
  return next;
}

export function removeSub(plan: PlanRow[], idx: number, k: number): PlanRow[] {
  const next = clone(plan);
  next[idx].subs.splice(k, 1);
  return next;
}

/** Course fee not yet covered by any installment (paise, can be negative = over the fee) */
export const unallocatedPaise = (plan: PlanRow[], fee: number) => toPaise(fee) - planTotalPaise(plan);

export const canAddManual = (plan: PlanRow[], fee: number) =>
  unallocatedPaise(plan, fee) > 0 && plan.filter(r => r.kind === 'manual').length < MAX_MANUAL_INSTALLMENTS;

/** Adds a manual installment for exactly the money that is not yet planned */
export function addManual(plan: PlanRow[], fee: number): PlanRow[] {
  if (!canAddManual(plan, fee)) return plan;
  const dates = plan.flatMap(r => [r.due_date, ...r.subs.map(s => s.due_date)]).filter(Boolean).sort();
  const lastDate = dates[dates.length - 1] || '';
  return [
    ...clone(plan),
    { kind: 'manual', target: 0, amount: rupees(unallocatedPaise(plan, fee)), due_date: addDays(lastDate, 30), subs: [] }
  ];
}

export function removeRow(plan: PlanRow[], idx: number): PlanRow[] {
  const next = clone(plan);
  if (next[idx]?.kind === 'manual') next.splice(idx, 1);
  return next;
}

/** Display label: Installment 1, 1.1 ... Manual Installment 4 */
export function rowLabel(plan: PlanRow[], idx: number): string {
  return plan[idx].kind === 'manual' ? `Manual Installment ${idx + 1}` : `Installment ${idx + 1}`;
}

/** First blocking problem with the plan, or null if it can be saved */
export function validatePlan(plan: PlanRow[], fee: number, fmt: (rupeeAmount: number) => string): string | null {
  const autos = plan.filter(r => r.kind === 'auto');
  if (autos.length < 1 || autos.length > MAX_INSTALLMENTS) return `Choose 1 to ${MAX_INSTALLMENTS} installments.`;

  for (let i = 0; i < plan.length; i++) {
    const row = plan[i];
    const label = rowLabel(plan, i);
    if (!(toPaise(row.amount) > 0)) return `${label}: amount must be greater than ₹0.`;
    if (!row.due_date) return `${label}: please select a due date.`;
    for (let k = 0; k < row.subs.length; k++) {
      const sub = row.subs[k];
      const subLabel = `Installment ${i + 1}.${k + 1}`;
      if (!(toPaise(sub.amount) > 0)) return `${subLabel}: amount must be greater than ₹0.`;
      if (!sub.due_date) return `${subLabel}: please select a due date.`;
      if (sub.due_date < row.due_date) return `${subLabel}: due date cannot be before ${label}.`;
    }
  }

  let prev = '';
  for (let i = 0; i < plan.length; i++) {
    if (plan[i].kind !== 'auto') continue;
    if (prev && plan[i].due_date < prev) return `Installment ${i + 1} due date cannot be before the previous installment.`;
    prev = plan[i].due_date;
  }

  const open = unallocatedPaise(plan, fee);
  if (open < 0) return `Installments total ${fmt(planTotalPaise(plan) / 100)}, which is ${fmt(-open / 100)} more than the course fee (${fmt(fee)}).`;
  if (open > 0) return `${fmt(open / 100)} of the course fee is not planned yet. Add a sub-installment or a manual installment for it.`;
  return null;
}

/** Shape sent to POST /api/students */
export function toPayload(plan: PlanRow[]) {
  const r2 = (v: string) => toPaise(v) / 100;
  return plan.map(row => ({
    amount: r2(row.amount),
    due_date: row.due_date,
    ...(row.kind === 'manual' ? { manual: true } : {}),
    ...(row.subs.length ? { subs: row.subs.map(s => ({ amount: r2(s.amount), due_date: s.due_date })) } : {})
  }));
}
