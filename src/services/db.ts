import { 
  User, Course, Trainer, Student, Installment, Payment, 
  LeaveApplication, ClassSchedule, AuditLog, ManualInstallmentInput,
  UserRole, Department
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
  departments: Department[];
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
    departments: [],
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
      departments: data.departments || [],
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

  // --- DEPARTMENTS ---
  public getDepartments(): Department[] {
    return this.state.departments;
  }

  public getDepartmentById(id: string): Department | undefined {
    return this.state.departments.find(d => d.id === id);
  }

  public async createDepartment(data: { name: string; code?: string; description?: string; status?: 'active' | 'inactive' }, _actor?: User): Promise<Department> {
    const dept = await api<Department>('POST', '/api/departments', data);
    await this.load();
    return dept;
  }

  public async updateDepartment(id: string, updates: Partial<Department>, _actor?: User): Promise<Department> {
    const dept = await api<Department>('PUT', `/api/departments/${id}`, updates);
    await this.load();
    return dept;
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
    department_id?: string;
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

  // --- DELETE (admin only; server enforces it) ---
  private async remove(url: string): Promise<void> {
    await api('DELETE', url);
    await this.load();
  }
  public deletePayment(id: string) { return this.remove(`/api/payments/${id}`); }
  public deleteInstallment(id: string) { return this.remove(`/api/installments/${id}`); }
  public deleteStudent(id: string) { return this.remove(`/api/students/${id}`); }
  public deleteTrainer(id: string) { return this.remove(`/api/trainers/${id}`); }
  public deleteCourse(id: string) { return this.remove(`/api/courses/${id}`); }
  public deleteDepartment(id: string) { return this.remove(`/api/departments/${id}`); }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return this.state.auditLogs;
  }

  // --- KPI & DASHBOARD METRICS ---
  /**
   * Dashboard numbers, optionally narrowed by department and/or period.
   *  - department: '' / 'all' = every department
   *  - year: 0 = all years
   *  - month: 0 = whole year (1-12 = that month); only used together with a year
   * Students are matched by their joining date, payments by payment date,
   * installments by due date. With no filters everything is counted.
   */
  public getDashboardMetrics(filters: { department?: string; year?: number; month?: number } = {}) {
    const deptId = filters.department && filters.department !== 'all' ? filters.department : '';
    const year = filters.year || 0;
    const month = year ? (filters.month || 0) : 0;

    const inPeriod = (dateStr: string | undefined): boolean => {
      if (!year) return true;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== year) return false;
      return !month || d.getMonth() + 1 === month;
    };

    const allStudents = this.state.students;
    const deptStudents = deptId ? allStudents.filter(s => s.department_id === deptId) : allStudents;
    const deptStudentIds = new Set(deptStudents.map(s => s.id));

    // Students who joined in the period (drives enrolment / revenue / status cards)
    const students = deptStudents.filter(s => inPeriod(s.joining_date));

    // Money actually received in the period for this department
    const payments = this.state.payments.filter(p =>
      p.payment_status === 'success' && deptStudentIds.has(p.student_id) && inPeriod(p.payment_date)
    );

    // Installments that fall due in the period for this department
    const installments = this.state.installments.filter(i =>
      deptStudentIds.has(i.student_id) && inPeriod(i.due_date)
    );

    const leaves = this.state.leaves.filter(l => deptStudentIds.has(l.student_id));
    const trainers = deptId
      ? this.state.trainers.filter(t => t.department_id === deptId)
      : this.state.trainers;

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const completedStudents = students.filter(s => s.status === 'completed').length;
    const onHoldStudents = students.filter(s => s.status === 'on_hold').length;
    const droppedStudents = students.filter(s => s.status === 'dropped' || s.status === 'cancelled').length;
    const totalTrainers = trainers.length;

    const amountCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    let totalRevenue: number;
    let totalOutstanding: number;
    if (!year) {
      // No period selected: whole-life numbers for the department (or everything)
      totalRevenue = students.reduce((sum, s) => sum + s.total_course_amount, 0);
      totalOutstanding = Math.max(0, totalRevenue - amountCollected);
    } else {
      // Period selected: billed = installments due in the period, outstanding = what is still unpaid on them
      totalRevenue = installments.reduce((sum, i) => sum + i.installment_amount, 0);
      totalOutstanding = installments.reduce((sum, i) => sum + Math.max(0, i.installment_amount - i.paid_amount), 0);
    }

    const partialPaymentsCount = students.filter(s => s.payment_status === 'partially_paid').length;

    const studentsWithDuesCount = students.filter(s =>
      this.state.installments.some(i => i.student_id === s.id && i.due_amount > 0 && (!year || inPeriod(i.due_date)))
    ).length;

    const pendingLeaveRequests = leaves.filter(l => l.status === 'pending').length;

    // Per-course enrolment inside the selected department / period
    const courseMap = new Map<string, { id: string; name: string; students: number; price: number }>();
    const visibleCourses = deptId
      ? this.state.courses.filter(c => c.department_id === deptId)
      : this.state.courses;
    visibleCourses.forEach(c => courseMap.set(c.id, { id: c.id, name: c.course_name, students: 0, price: c.base_price }));
    students.forEach(s => {
      const row = courseMap.get(s.course_id);
      if (row) row.students += 1;
    });
    const courseBreakdown = Array.from(courseMap.values());

    // Collections trend: 12 months of the selected year, or the last 5 months by default
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const deptPayments = this.state.payments.filter(p => p.payment_status === 'success' && deptStudentIds.has(p.student_id));
    const sumFor = (y: number, m: number) => deptPayments
      .filter(p => {
        const pd = new Date(p.payment_date);
        return pd.getFullYear() === y && pd.getMonth() === m;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyCollections: { month: string; amount: number }[] = [];
    if (year) {
      for (let m = 0; m < 12; m++) {
        if (month && m + 1 !== month) continue;
        monthlyCollections.push({ month: `${monthShort[m]} ${year}`, amount: sumFor(year, m) });
      }
    } else {
      const now = new Date();
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyCollections.push({ month: `${monthShort[d.getMonth()]} ${d.getFullYear()}`, amount: sumFor(d.getFullYear(), d.getMonth()) });
      }
    }

    return {
      totalStudents,
      activeStudents,
      completedStudents,
      onHoldStudents,
      droppedStudents,
      totalTrainers,
      totalRevenue,
      amountCollected,
      totalOutstanding,
      partialPaymentsCount,
      studentsWithDuesCount,
      pendingLeaveRequests,
      courseBreakdown,
      monthlyCollections
    };
  }

  /** Years that have any data (joining / payment / due dates) – feeds the year filter */
  public getAvailableYears(): number[] {
    const years = new Set<number>([new Date().getFullYear()]);
    const add = (d?: string) => {
      if (!d) return;
      const y = new Date(d).getFullYear();
      if (!isNaN(y)) years.add(y);
    };
    this.state.students.forEach(s => add(s.joining_date));
    this.state.payments.forEach(p => add(p.payment_date));
    this.state.installments.forEach(i => add(i.due_date));
    return Array.from(years).sort((a, b) => b - a);
  }

  /** Per-department roll-up used by the Departments page */
  public getDepartmentSummary(departmentId: string) {
    const students = this.state.students.filter(s => s.department_id === departmentId);
    const ids = new Set(students.map(s => s.id));
    const collected = this.state.payments
      .filter(p => p.payment_status === 'success' && ids.has(p.student_id))
      .reduce((sum, p) => sum + p.amount, 0);
    const totalFees = students.reduce((sum, s) => sum + s.total_course_amount, 0);
    return {
      students,
      courses: this.state.courses.filter(c => c.department_id === departmentId),
      trainers: this.state.trainers.filter(t => t.department_id === departmentId),
      totalFees,
      collected,
      outstanding: Math.max(0, totalFees - collected)
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
