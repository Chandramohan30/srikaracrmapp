import mongoose, { Schema, Document } from 'mongoose';

// 1. User Schema & Model
export interface IUser extends Document {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'trainer' | 'student';
  status: 'active' | 'inactive';
  avatar?: string;
  student_id?: string;
  trainer_id?: string;
  password_hash?: string;
  created_at: Date;
}

export const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  role: { type: String, required: true, enum: ['admin', 'trainer', 'student'] },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  avatar: { type: String },
  student_id: { type: String },
  trainer_id: { type: String },
  password_hash: { type: String, select: false },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

// 2. Course Schema & Model
export interface ICourse extends Document {
  id: string;
  course_code: string;
  course_name: string;
  description: string;
  duration: string;
  base_price: number;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export const CourseSchema = new Schema<ICourse>({
  id: { type: String, required: true, unique: true },
  course_code: { type: String, required: true, unique: true },
  course_name: { type: String, required: true },
  description: { type: String, default: '' },
  duration: { type: String, required: true },
  base_price: { type: Number, required: true, min: 0 },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 3. Trainer Schema & Model
export interface ITrainer extends Document {
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
  assigned_students_count: number;
  created_at: Date;
  updated_at: Date;
}

export const TrainerSchema = new Schema<ITrainer>({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  trainer_code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: '' },
  specialization: { type: String, default: '' },
  experience: { type: String, default: '' },
  joining_date: { type: String, default: '' },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  skills: { type: [String], default: [] },
  profile_image: { type: String },
  assigned_students_count: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 4. Student Schema & Model
export interface IStudent extends Document {
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
  status: 'lead' | 'onboarding' | 'active' | 'on_hold' | 'completed' | 'dropped' | 'cancelled';
  payment_status: 'not_paid' | 'partially_paid' | 'paid' | 'has_due' | 'fully_paid';
  total_course_amount: number;
  total_paid: number;
  total_outstanding: number;
  created_at: Date;
  updated_at: Date;
}

export const StudentSchema = new Schema<IStudent>({
  id: { type: String, required: true, unique: true },
  student_code: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  full_name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  alternate_phone: { type: String },
  date_of_birth: { type: String },
  gender: { type: String },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  qualification: { type: String, default: '' },
  college: { type: String },
  passing_year: { type: String },
  course_id: { type: String, required: true },
  course_name: { type: String, required: true },
  trainer_id: { type: String, required: true },
  trainer_name: { type: String, required: true },
  joining_date: { type: String, required: true },
  expected_completion_date: { type: String, default: '' },
  status: { 
    type: String, 
    default: 'active', 
    enum: ['lead', 'onboarding', 'active', 'on_hold', 'completed', 'dropped', 'cancelled'] 
  },
  payment_status: { 
    type: String, 
    default: 'not_paid', 
    enum: ['not_paid', 'partially_paid', 'paid', 'has_due', 'fully_paid'] 
  },
  total_course_amount: { type: Number, required: true, min: 0 },
  total_paid: { type: Number, default: 0, min: 0 },
  total_outstanding: { type: Number, required: true, min: 0 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 5. Installment Schema & Model
export interface IInstallment extends Document {
  id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  course_name?: string;
  installment_number: number;
  name?: string;
  month: string;
  installment_amount: number;
  paid_amount: number;
  due_amount: number;
  pay_now_amount?: number;
  parent_installment_id?: string;
  sub_number?: number;
  due_date: string;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  is_manual?: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export const InstallmentSchema = new Schema<IInstallment>({
  id: { type: String, required: true, unique: true },
  student_id: { type: String, required: true, index: true },
  student_name: { type: String },
  student_code: { type: String },
  course_name: { type: String },
  installment_number: { type: Number, required: true },
  name: { type: String },
  month: { type: String, required: true },
  installment_amount: { type: Number, required: true, min: 0 },
  paid_amount: { type: Number, default: 0, min: 0 },
  due_amount: { type: Number, required: true, min: 0 },
  pay_now_amount: { type: Number, min: 0 },
  parent_installment_id: { type: String },
  sub_number: { type: Number },
  due_date: { type: String, required: true },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'partially_paid', 'paid', 'overdue'] 
  },
  is_manual: { type: Boolean, default: false },
  notes: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 6. Payment Schema & Model
export interface IPayment extends Document {
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
  payment_date: Date;
  payment_method: 'upi' | 'card' | 'netbanking' | 'cash' | 'bank_transfer';
  gateway: string;
  payment_status: 'success' | 'failed' | 'pending';
  recorded_by: string;
  receipt_number: string;
  notes?: string;
  has_proof?: boolean;
  proof_screenshot?: string; // data URL, never sent in bootstrap (select:false)
  proof_hash?: string;       // sha256 of screenshot, blocks re-using the same screenshot
  created_at: Date;
}

export const PaymentSchema = new Schema<IPayment>({
  id: { type: String, required: true, unique: true },
  student_id: { type: String, required: true, index: true },
  student_name: { type: String, required: true },
  student_code: { type: String },
  course_id: { type: String },
  course_name: { type: String, required: true },
  installment_id: { type: String, required: true, index: true },
  installment_month: { type: String, required: true },
  transaction_id: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  payment_date: { type: Date, default: Date.now },
  payment_method: { 
    type: String, 
    required: true, 
    enum: ['upi', 'card', 'netbanking', 'cash', 'bank_transfer'] 
  },
  gateway: { type: String, default: 'UPI (Screenshot Verified)' },
  payment_status: { 
    type: String, 
    default: 'success', 
    enum: ['success', 'failed', 'pending'] 
  },
  recorded_by: { type: String, default: 'System' },
  receipt_number: { type: String, required: true, unique: true },
  notes: { type: String },
  has_proof: { type: Boolean, default: false },
  proof_screenshot: { type: String, select: false },
  proof_hash: { type: String, select: false, index: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 7. Leave Application Schema & Model
export interface ILeaveApplication extends Document {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  trainer_id?: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  admin_remarks?: string;
  approved_by?: string;
  approved_at?: Date;
  applied_date: Date;
  reviewed_by?: string;
  created_at: Date;
}

export const LeaveSchema = new Schema<ILeaveApplication>({
  id: { type: String, required: true, unique: true },
  student_id: { type: String, required: true, index: true },
  student_name: { type: String, required: true },
  student_code: { type: String, required: true },
  trainer_id: { type: String },
  from_date: { type: String, required: true },
  to_date: { type: String, required: true },
  days: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true },
  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'approved', 'rejected'] 
  },
  rejection_reason: { type: String },
  admin_remarks: { type: String },
  approved_by: { type: String },
  approved_at: { type: Date },
  applied_date: { type: Date, default: Date.now },
  reviewed_by: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 8. Class Schedule Schema & Model
export interface IClassSchedule extends Document {
  id: string;
  student_id: string;
  student_name: string;
  trainer_id: string;
  trainer_name: string;
  course_name: string;
  class_date: string;
  start_time: string;
  end_time: string;
  title: string;
  topic: string;
  meeting_url: string;
  google_event_id?: string;
  google_calendar_event_id?: string;
  google_calendar_synced: boolean;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export const ScheduleSchema = new Schema<IClassSchedule>({
  id: { type: String, required: true, unique: true },
  student_id: { type: String, required: true, index: true },
  student_name: { type: String, required: true },
  trainer_id: { type: String, required: true, index: true },
  trainer_name: { type: String, required: true },
  course_name: { type: String, required: true },
  class_date: { type: String, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  title: { type: String, required: true },
  topic: { type: String, required: true },
  meeting_url: { type: String, default: '' },
  google_event_id: { type: String },
  google_calendar_event_id: { type: String },
  google_calendar_synced: { type: Boolean, default: false },
  notes: { type: String },
  status: { 
    type: String, 
    default: 'scheduled', 
    enum: ['scheduled', 'completed', 'cancelled'] 
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 9. Audit Log Schema & Model
export interface IAuditLog extends Document {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
  created_at: Date;
}

export const AuditLogSchema = new Schema<IAuditLog>({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  user_role: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entity_id: { type: String, required: true },
  old_value: { type: String },
  new_value: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 10. Settings Schema & Model
export interface ISettings extends Document {
  id: string;
  academyName: string;
  academyEmail: string;
  academyPhone: string;
  website: string;
  address: string;
  gstin: string;
}

export const SettingsSchema = new Schema<ISettings>({
  id: { type: String, default: 'default_settings', unique: true },
  academyName: { type: String, default: 'Srikara Training & Placement Academy' },
  academyEmail: { type: String, default: 'contact@srikaraacademy.com' },
  academyPhone: { type: String, default: '+91 98400 11223' },
  website: { type: String, default: 'www.srikaraacademy.com' },
  address: { type: String, default: 'No 45, Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu 641012' },
  gstin: { type: String, default: '33AABCS1429B1Z2' }
}, { timestamps: true });

// 11. Counter (atomic sequence for student / trainer IDs)
export interface ICounter extends Document {
  key: string;
  seq: number;
}

export const CounterSchema = new Schema<ICounter>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

// 12. Refresh tokens (only a SHA-256 hash of the token is stored)
export interface IRefreshToken extends Document {
  jti: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  replaced_by?: string;
  created_at: Date;
}

export const RefreshTokenSchema = new Schema<IRefreshToken>({
  jti: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  token_hash: { type: String, required: true },
  expires_at: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  replaced_by: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
// MongoDB removes expired documents automatically
RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Export Models
export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const CourseModel = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
export const TrainerModel = mongoose.models.Trainer || mongoose.model<ITrainer>('Trainer', TrainerSchema);
export const StudentModel = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
export const InstallmentModel = mongoose.models.Installment || mongoose.model<IInstallment>('Installment', InstallmentSchema);
export const PaymentModel = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
export const LeaveModel = mongoose.models.Leave || mongoose.model<ILeaveApplication>('Leave', LeaveSchema);
export const ScheduleModel = mongoose.models.Schedule || mongoose.model<IClassSchedule>('Schedule', ScheduleSchema);
export const AuditLogModel = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
export const SettingsModel = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export const RefreshTokenModel = mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
export const CounterModel = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
