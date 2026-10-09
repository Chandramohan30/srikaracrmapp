export type UserRole = 'admin' | 'trainer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  student_id?: string;
  trainer_id?: string;
  created_at: string;
}

export interface Course {
  id: string;
  course_code: string;
  course_name: string;
  description: string;
  duration: string;
  base_price: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Trainer {
  id: string;
  user_id: string;
  trainer_code: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: string;
  joining_date: string;
  status: 'active' | 'inactive';
  skills: string[];
  profile_image?: string;
  assigned_students_count?: number;
  created_at: string;
  updated_at: string;
}

export type StudentStatus = 
  | 'lead' 
  | 'onboarding' 
  | 'active' 
  | 'on_hold' 
  | 'completed' 
  | 'dropped' 
  | 'cancelled';

export type StudentPaymentStatus = 
  | 'not_paid' 
  | 'partially_paid' 
  | 'paid' 
  | 'has_due' 
  | 'fully_paid';

export interface Student {
  id: string;
  student_code: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  date_of_birth?: string;
  gender?: string;
  address: string;
  city: string;
  state: string;
  qualification: string;
  college?: string;
  passing_year?: string;
  course_id: string;
  course_name: string;
  trainer_id: string;
  trainer_name: string;
  joining_date: string;
  expected_completion_date: string;
  status: StudentStatus;
  payment_status: StudentPaymentStatus;
  total_course_amount: number;
  total_paid: number;
  total_outstanding: number;
  created_at: string;
  updated_at: string;
}

export type InstallmentStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';

export interface Installment {
  id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  course_name?: string;
  installment_number: number;
  name?: string; // e.g. "Installment 1" or "Manual Adjustment"
  month: string; // e.g. "January 2026"
  installment_amount: number;
  paid_amount: number;
  due_amount: number;
  pay_now_amount?: number; // agreed partial amount the student pays now (cumulative target)
  parent_installment_id?: string; // set on sub-installments (e.g. Installment 1.1 under Installment 1)
  sub_number?: number;
  due_date: string;
  status: InstallmentStatus;
  is_manual?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cash' | 'bank_transfer';
export type PaymentTransactionStatus = 'success' | 'failed' | 'pending';

export interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  student_code?: string;
  course_id?: string;
  course_name: string;
  installment_id: string;
  installment_month: string;
  transaction_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  gateway: string;
  payment_status: PaymentTransactionStatus;
  recorded_by: string;
  receipt_number: string;
  notes?: string;
  has_proof?: boolean;
  created_at: string;
}

export interface ManualInstallmentInput {
  student_id: string;
  amount: number;
  month: string;
  due_date: string;
  notes: string;
  name?: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveApplication {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  trainer_id?: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  applied_date: string;
  admin_remarks?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface ClassSchedule {
  id: string;
  student_id: string;
  student_name: string;
  trainer_id: string;
  trainer_name: string;
  course_name: string;
  title: string;
  topic: string;
  class_date: string;
  start_time: string;
  end_time: string;
  meeting_url: string;
  google_event_id?: string;
  google_calendar_synced: boolean;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}
