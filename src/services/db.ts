import { 
  User, Course, Trainer, Student, Installment, Payment, 
  LeaveApplication, ClassSchedule, AuditLog, ManualInstallmentInput,
  UserRole
} from '../types/crm';
import { getMonthNamesFromDate, splitAmountIntoTwoInstallments } from '../server/finance';

// Re-exported so existing components keep working unchanged
export { getMonthNamesFromDate, splitAmountIntoTwoInstallments };

// ---------------------------------------------------------------------------
// API client (all data now comes from the Express + MongoDB Atlas backend)
// ---------------------------------------------------------------------------
const ACCESS_KEY = 'srikara_access_token';
const REFRESH_KEY = 'srikara_refresh_token';
const LEGACY_KEY = 'srikara_auth_token'; // old single-token key, removed on sight

const read = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};
const remove = (k: string) => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
};

export const authToken = {
  getAccess: (): string | null => read(ACCESS_KEY),
  getRefresh: (): string | null => read(REFRESH_KEY),
  /** true when there is something to restore a session from */
  hasSession: (): boolean => !!(read(ACCESS_KEY) || read(REFRESH_KEY)),
  set: (accessToken: string, refreshToken: string) => {
    write(ACCESS_KEY, accessToken);
    write(REFRESH_KEY, refreshToken);
    remove(LEGACY_KEY);
  },
  clear: () => {
    remove(ACCESS_KEY);
    remove(REFRESH_KEY);
    remove(LEGACY_KEY);
  }
};

// One refresh at a time: parallel requests that all get a 401 share the same refresh call
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = authToken.getRefresh();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data.accessToken || !data.refreshToken) return false;
      authToken.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** fetch() with the Bearer token; on 401 it refreshes the session once and retries */
export async function authedFetch(method: string, url: string, body?: unknown): Promise<Response> {
  const send = () => {
    const token = authToken.getAccess();
    return fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  };

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new Error('Cannot reach the server. Please check your connection and try again.');
  }

  const isAuthRoute = url.startsWith('/api/auth/login') || url.startsWith('/api/auth/refresh');
  if (res.status === 401 && !isAuthRoute) {
    if (await refreshSession()) {
      try {
        res = await send();
      } catch {
        throw new Error('Cannot reach the server. Please check your connection and try again.');
      }
    }
    if (res.status === 401) {
      // refresh token also dead -> back to the login page
      window.dispatchEvent(new Event('srikara:unauthorized'));
    }
  }
  return res;
}

export async function api<T = any>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await authedFetch(method, url, body);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

/** Tells the server to revoke this device's refresh token (best effort) */
export async function revokeSession(): Promise<void> {
  const refreshToken = authToken.getRefresh();
  if (!refreshToken) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
  } catch { /* ignore */ }
}

interface Settings {
  academyName: string;
  academyEmail: string;
  academyPhone: string;
  website: string;
  address: string;
  gstin: string;
}

interface DatabaseState {
  users: User[];
  courses: Course[];
  trainers: Trainer[];
  students: Student[];
  installments: Installment[];
  payments: Payment[];
  leaves: LeaveApplication[];
  schedules: ClassSchedule[];
  auditLogs: AuditLog[];
  settings: Settings;
}

function emptyState(): DatabaseState {
  return {
    users: [],
    courses: [],
    trainers: [],
    students: [],
    installments: [],
    payments: [],
    leaves: [],
    schedules: [],
    auditLogs: [],
    settings: {
      academyName: 'Srikara Training & Placement Academy',
      academyEmail: 'contact@srikaraacademy.com',
      academyPhone: '',
      website: 'www.srikaraacademy.com',
      address: '',
      gstin: ''
    }
  };
}

/**
 * DatabaseService
 * - Reads are synchronous from an in-memory copy that is loaded from the API (`load()`).
 * - Every write is an async API call to MongoDB; the copy is refreshed afterwards.
 */
class DatabaseService {
  private state: DatabaseState = emptyState();

  // --- LOAD / RESET LOCAL CACHE ---
  public async load(): Promise<void> {
    const data = await api<Partial<DatabaseState>>('GET', '/api/bootstrap');
    const empty = emptyState();
    this.state = {
      users: data.users || [],
      courses: data.courses || [],
      trainers: data.trainers || [],
      students: data.students || [],
      installments: data.installments || [],
      payments: data.payments || [],
      leaves: data.leaves || [],
      schedules: data.schedules || [],
      auditLogs: data.auditLogs || [],
      settings: { ...empty.settings, ...(data.settings || {}) }
    };
  }

  public clear(): void {
    this.state = emptyState();
  }

  // --- USERS & AUTH ---
  public getUsers(): User[] {
    return this.state.users;
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  // --- COURSES ---
  public getCourses(): Course[] {
    return this.state.courses;
  }

  public getCourseById(id: string): Course | undefined {
    return this.state.courses.find(c => c.id === id);
  }

  public async createCourse(data: Omit<Course, 'id' | 'created_at' | 'updated_at'>, _actor?: User): Promise<Course> {
    const course = await api<Course>('POST', '/api/courses', data);
    await this.load();
    return course;
  }

  public async updateCourse(id: string, updates: Partial<Course>, _actor?: User): Promise<Course> {
    const course = await api<Course>('PUT', `/api/courses/${id}`, updates);
    await this.load();
    return course;
  }

  // --- TRAINERS ---
  public getTrainers(): Trainer[] {
    return this.state.trainers;
  }

  public getTrainerById(id: string): Trainer | undefined {
    return this.state.trainers.find(t => t.id === id);
  }

  public async createTrainer(
    data: Omit<Trainer, 'id' | 'created_at' | 'updated_at' | 'assigned_students_count'>,
    _actor?: User
  ): Promise<Trainer> {
    const trainer = await api<Trainer>('POST', '/api/trainers', data);
    await this.load();
    return trainer;
  }

  public async updateTrainer(id: string, updates: Partial<Trainer>, _actor?: User): Promise<Trainer> {
    const trainer = await api<Trainer>('PUT', `/api/trainers/${id}`, updates);
    await this.load();
    return trainer;
  }

  // --- STUDENTS & ONBOARDING ---
  public getStudents(role?: UserRole, currentUserId?: string): Student[] {
    if (role === 'trainer' && currentUserId) {
      const trainer = this.state.trainers.find(t => t.user_id === currentUserId || t.id === currentUserId);
      if (trainer) {
        return this.state.students.filter(s => s.trainer_id === trainer.id);
      }
    }
    if (role === 'student' && currentUserId) {
      const student = this.state.students.find(s => s.user_id === currentUserId || s.id === currentUserId);
      return student ? [student] : [];
    }
    return this.state.students;
  }

  public getStudentById(id: string): Student | undefined {
    return this.state.students.find(s => s.id === id);
  }

  public async onboardStudent(data: {
    first_name: string;
    last_name: string;
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
    trainer_id: string;
    joining_date: string;
    expected_completion_date?: string;
  }, _actor?: User): Promise<{ student: Student; installments: Installment[] }> {
    const result = await api<{ student: Student; installments: Installment[] }>('POST', '/api/students', data);
    await this.load();
    return result;
  }

  public async updateStudent(id: string, updates: Partial<Student>, _actor?: User): Promise<Student> {
    const student = await api<Student>('PUT', `/api/students/${id}`, updates);
    await this.load();
    return student;
  }

  // --- INSTALLMENTS & PAYMENTS ---
  public getInstallments(studentId?: string): Installment[] {
    if (studentId) {
      return this.state.installments.filter(i => i.student_id === studentId);
    }
    return this.state.installments;
  }

  public getInstallmentById(id: string): Installment | undefined {
    return this.state.installments.find(i => i.id === id);
  }

  public async addManualInstallment(input: ManualInstallmentInput, _actor?: User): Promise<Installment> {
    const inst = await api<Installment>('POST', '/api/installments', input);
    await this.load();
    return inst;
  }

  public async updateInstallment(id: string, updates: {
    installment_amount?: number;
    month?: string;
    due_date?: string;
    notes?: string;
    pay_now?: number | null;
  }, _actor?: User): Promise<Installment> {
    const inst = await api<Installment>('PUT', `/api/installments/${id}`, updates);
    await this.load();
    return inst;
  }

  public async settleInstallmentBalance(id: string, input: {
    mode: 'next' | 'sub';
    amount?: number;
    due_date?: string;
    month?: string;
    notes?: string;
  }, _actor?: User): Promise<string> {
    const r = await api<{ message: string }>('POST', `/api/installments/${id}/settle-balance`, input);
    await this.load();
    return r.message;
  }

  public async recordPayment(params: {
    student_id: string;
    installment_id: string;
    amount: number;
    utr?: string;
    proof_screenshot: string; // data URL - required, the server refuses without it
    notes?: string;
  }, _actor?: User): Promise<Payment> {
    const payment = await api<Payment>('POST', '/api/payments', params);
    await this.load();
    return payment;
  }

  public getPayments(studentId?: string): Payment[] {
    if (studentId) {
      return this.state.payments.filter(p => p.student_id === studentId);
    }
    return this.state.payments;
  }

  // --- LEAVE MANAGEMENT ---
  public getLeaves(role?: UserRole, currentUserId?: string): LeaveApplication[] {
    if (role === 'student' && currentUserId) {
      const student = this.state.students.find(s => s.user_id === currentUserId || s.id === currentUserId);
      if (student) {
        return this.state.leaves.filter(l => l.student_id === student.id);
      }
    }
    if (role === 'trainer' && currentUserId) {
      const trainer = this.state.trainers.find(t => t.user_id === currentUserId || t.id === currentUserId);
      if (trainer) {
        return this.state.leaves.filter(l => l.trainer_id === trainer.id);
      }
    }
    return this.state.leaves;
  }

  public async applyLeave(data: {
    student_id: string;
    from_date: string;
    to_date: string;
    reason: string;
  }, _actor?: User): Promise<LeaveApplication> {
    const leave = await api<LeaveApplication>('POST', '/api/leaves', data);
    await this.load();
    return leave;
  }

  public async approveLeave(leaveId: string, remarks: string, _actor?: User): Promise<LeaveApplication> {
    const leave = await api<LeaveApplication>('POST', `/api/leaves/${leaveId}/approve`, { remarks });
    await this.load();
    return leave;
  }

  public async rejectLeave(leaveId: string, remarks: string, _actor?: User): Promise<LeaveApplication> {
    const leave = await api<LeaveApplication>('POST', `/api/leaves/${leaveId}/reject`, { remarks });
    await this.load();
    return leave;
  }

  // --- CLASS SCHEDULES & GOOGLE CALENDAR ---
  public getSchedules(role?: UserRole, currentUserId?: string): ClassSchedule[] {
    if (role === 'trainer' && currentUserId) {
      const trainer = this.state.trainers.find(t => t.user_id === currentUserId || t.id === currentUserId);
      if (trainer) {
        return this.state.schedules.filter(s => s.trainer_id === trainer.id);
      }
    }
    if (role === 'student' && currentUserId) {
      const student = this.state.students.find(s => s.user_id === currentUserId || s.id === currentUserId);
      if (student) {
        return this.state.schedules.filter(s => s.student_id === student.id);
      }
    }
    return this.state.schedules;
  }

  public async createSchedule(data: {
    student_id: string;
    trainer_id: string;
    title: string;
    topic: string;
    class_date: string;
    start_time: string;
    end_time: string;
    meeting_url?: string;
    notes?: string;
  }, _actor?: User): Promise<ClassSchedule> {
    const schedule = await api<ClassSchedule>('POST', '/api/schedules', data);
    await this.load();
    return schedule;
  }

  public async updateSchedule(id: string, updates: Partial<ClassSchedule>, _actor?: User): Promise<ClassSchedule> {
    const schedule = await api<ClassSchedule>('PUT', `/api/schedules/${id}`, updates);
    await this.load();
    return schedule;
  }

  public async deleteSchedule(id: string, _actor?: User): Promise<void> {
    await api('DELETE', `/api/schedules/${id}`);
    await this.load();
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  // --- KPI & DASHBOARD METRICS ---
  public getDashboardMetrics() {
    const students = this.state.students;
    const payments = this.state.payments.filter(p => p.payment_status === 'success');
    const installments = this.state.installments;
    const leaves = this.state.leaves;

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const completedStudents = students.filter(s => s.status === 'completed').length;
    const totalTrainers = this.state.trainers.length;

    const totalRevenue = students.reduce((sum, s) => sum + s.total_course_amount, 0);
    const amountCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = Math.max(0, totalRevenue - amountCollected);

    const partialPaymentsCount = students.filter(s => s.payment_status === 'partially_paid').length;
    
    const studentsWithDuesCount = students.filter(s => {
      const insts = installments.filter(i => i.student_id === s.id);
      return insts.some(i => i.due_amount > 0);
    }).length;

    const pendingLeaveRequests = leaves.filter(l => l.status === 'pending').length;

    const fullStackCount = students.filter(s => s.course_name.toLowerCase().includes('full stack')).length;
    const aimlCount = students.filter(s => s.course_name.toLowerCase().includes('ai')).length;

    // Last 5 calendar months of real collections
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthlyCollections: { month: string; amount: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const amount = payments
        .filter(p => {
          const pd = new Date(p.payment_date);
          return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
        })
        .reduce((sum, p) => sum + p.amount, 0);
      monthlyCollections.push({ month: `${monthShort[d.getMonth()]} ${d.getFullYear()}`, amount });
    }

    return {
      totalStudents,
      activeStudents,
      completedStudents,
      totalTrainers,
      totalRevenue,
      amountCollected,
      totalOutstanding,
      partialPaymentsCount,
      studentsWithDuesCount,
      pendingLeaveRequests,
      fullStackCount,
      aimlCount,
      monthlyCollections
    };
  }

  // --- SETTINGS ---
  public getSettings() {
    return this.state.settings;
  }

  public async updateSettings(updates: Partial<Settings>, _actor?: User) {
    const settings = await api<Settings>('PUT', '/api/settings', updates);
    await this.load();
    return settings;
  }
}

export const db = new DatabaseService();
