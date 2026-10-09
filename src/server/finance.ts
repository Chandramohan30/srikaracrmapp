// Pure helper functions shared by the API server and the React UI.
// (No Node / browser specific imports so both sides can use it.)

export const round2 = (n: number): number => Math.round(n * 100) / 100;

// Month formatting utility
export function getMonthNamesFromDate(startDateStr: string, count: number = 3): { month: string; dueDate: string }[] {
  const date = new Date(startDateStr);
  if (isNaN(date.getTime())) {
    const today = new Date();
    date.setTime(today.getTime());
  }

  const results: { month: string; dueDate: string }[] = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let currentYear = date.getFullYear();
  let currentMonthIdx = date.getMonth(); // 0-indexed

  for (let i = 0; i < count; i++) {
    const monthName = `${monthNames[currentMonthIdx]} ${currentYear}`;
    const dueDay = Math.min(date.getDate(), 28);
    const formattedDueMonth = String(currentMonthIdx + 1).padStart(2, '0');
    const formattedDueDay = String(dueDay).padStart(2, '0');
    const dueDate = `${currentYear}-${formattedDueMonth}-${formattedDueDay}`;

    results.push({ month: monthName, dueDate });

    currentMonthIdx++;
    if (currentMonthIdx > 11) {
      currentMonthIdx = 0;
      currentYear++;
    }
  }

  return results;
}

// Split course amount into 2 installments with exact decimal rounding
export function splitAmountIntoTwoInstallments(totalAmount: number): [number, number] {
  const total = Math.round(totalAmount * 100) / 100;
  const first = Math.floor((total / 2) * 100) / 100;
  const second = Math.round((total - first) * 100) / 100;
  return [first, second];
}

// What the student actually owes on an installment right now (ignores any "pay now" arrangement)
export function getActualDue(inst: { installment_amount: number; paid_amount: number }): number {
  return Math.max(0, round2(inst.installment_amount - inst.paid_amount));
}

// Amount the student has to pay in this sitting.
// If admin agreed a smaller "pay now" amount (e.g. ₹4,000 of a ₹10,000 installment)
// that is the payable amount; otherwise it is the full remaining due.
export function getPayableNow(inst: {
  installment_amount: number; paid_amount: number; pay_now_amount?: number | null;
}): number {
  const actual = getActualDue(inst);
  const target = inst.pay_now_amount;
  if (target && target > inst.paid_amount) {
    return Math.min(actual, Math.max(0, round2(target - inst.paid_amount)));
  }
  return actual;
}

// Due shown in the UI = installment - (paid, or the agreed pay-now target if that is higher)
export function getDisplayDue(inst: {
  installment_amount: number; paid_amount: number; pay_now_amount?: number | null;
}): number {
  const covered = Math.max(inst.paid_amount, inst.pay_now_amount || 0);
  return Math.max(0, round2(inst.installment_amount - covered));
}

export type InstallmentStatusValue = 'pending' | 'partially_paid' | 'paid' | 'overdue';

// Status of one installment given how much has been paid against it
export function computeInstallmentStatus(
  installmentAmount: number,
  paid: number,
  dueDate: string
): InstallmentStatusValue {
  const due = Math.max(0, round2(installmentAmount - paid));
  if (paid >= installmentAmount) return 'paid';
  if (paid > 0) return 'partially_paid';
  if (new Date(dueDate) < new Date() && due > 0) return 'overdue';
  return 'pending';
}
