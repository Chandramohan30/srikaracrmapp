import React, { useState } from 'react';
import { 
  Users, UserCheck, GraduationCap, DollarSign, CreditCard, 
  AlertTriangle, Clock, TrendingUp, Calendar, CheckCircle, 
  ArrowUpRight, Plus, ExternalLink, ShieldAlert, Lock, Filter, Building2
} from 'lucide-react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, DueBadge } from '../components/StatusBadges';
import { NavTab } from '../components/Sidebar';
import { StudentPaymentModal } from '../components/StudentPaymentModal';
import { StudentInstallmentsTable } from '../components/StudentInstallmentsTable';
import { PeriodFilter, PeriodValue, defaultPeriod, periodRange, periodLabel as describePeriod } from '../components/PeriodFilter';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenOnboardModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenOnboardModal
}) => {
  const { currentUser, isAdmin, isTrainer, isStudent } = useAuth();
  const [selectedStudentInstallmentId, setSelectedStudentInstallmentId] = useState<string | undefined>(undefined);
  const [isStudentPaymentModalOpen, setIsStudentPaymentModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dashboard filters: department (default = all) + period (all time / month / year / custom date range)
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodValue>(defaultPeriod());

  const departments = db.getDepartments();
  const availableYears = db.getAvailableYears();
  const range = periodRange(period);
  const hasPeriod = !!(range.from || range.to);
  const metrics = db.getDashboardMetrics({ department: departmentFilter, ...range });
  const hasFilters = departmentFilter !== 'all' || period.mode !== 'all';
  const periodLabel = describePeriod(period);
  const departmentLabel = departmentFilter === 'all'
    ? 'All departments'
    : (db.getDepartmentById(departmentFilter)?.name || 'Department');
  const recentLogs = db.getAuditLogs().slice(0, 6);
  const students = db.getStudents(currentUser.role, currentUser.id);

  // Student portal customized view
  if (isStudent) {
    const student = students[0];
    const installments = student ? db.getInstallments(student.id) : [];
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 rounded-xl p-6 text-white border border-blue-800 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                Student Learning Portal
              </span>
              <h2 className="text-xl font-bold mt-1">
                Welcome back, {student?.full_name || currentUser.name}!
              </h2>
              <p className="text-xs text-blue-100 mt-1">
                Enrolled in <strong className="text-white">{student?.course_name}</strong> · Faculty: <strong className="text-white">{student?.trainer_name}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedStudentInstallmentId(undefined);
                  setIsStudentPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-800 font-semibold text-xs rounded-lg shadow-xs transition-colors"
              >
                View Payment Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Student Quick Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Course Fee</span>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {formatCurrency(student?.total_course_amount || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total agreed tuition</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Amount Paid</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
              {formatCurrency(student?.total_paid || 0)}
            </div>
            <div className="text-xs text-emerald-600 mt-1">Paid installments</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Due</span>
            <div className="text-2xl font-bold text-red-700 mt-1 tabular-nums">
              {formatCurrency(student?.total_outstanding || 0)}
            </div>
            <div className="mt-1">
              {student && <DueBadge amount={student.total_outstanding} />}
            </div>
          </div>
        </div>

        {/* Installment plan (sub-installments shown under their installment) */}
        <StudentInstallmentsTable
          installments={installments}
          onPay={(id) => { setSelectedStudentInstallmentId(id); setIsStudentPaymentModalOpen(true); }}
        />

        {/* Student Payment Modal */}
        {student && isStudentPaymentModalOpen && (
          <StudentPaymentModal
            student={student}
            isOpen={isStudentPaymentModalOpen}
            initialInstallmentId={selectedStudentInstallmentId}
            onClose={() => {
              setIsStudentPaymentModalOpen(false);
              setSelectedStudentInstallmentId(undefined);
            }}
            onDataChanged={() => {
              setRefreshKey(k => k + 1);
            }}
          />
        )}

      </div>
    );
  }

  // Admin and Trainer Dashboards
  return (
    <div className="space-y-6">
      {/* Top Welcome / Action Banner */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 rounded-xl p-5 sm:p-6 text-white border border-blue-800 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">
                Srikara Academy Operations
              </span>
              
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Welcome Back, {currentUser.name}
            </h2>
            
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenOnboardModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-blue-50 text-blue-800 font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Onboard New Student
              </button>
              <button
                onClick={() => onNavigate('installments')}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold text-xs rounded-lg border border-white/25 transition-colors"
              >
                View Dues Tracker
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters: Department + Period (month / year / custom date range) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
        <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px] uppercase mr-1">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="h-9 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-medium outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          aria-label="Department"
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <PeriodFilter value={period} onChange={setPeriod} years={availableYears} />

        

        {hasFilters && (
          <button
            onClick={() => { setDepartmentFilter('all'); setPeriod(defaultPeriod()); }}
            className="text-blue-700 font-semibold hover:underline text-[11px]"
          >
            Reset
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div>
       
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3">
          {/* 1. Total Students */}
          <div 
            onClick={() => onNavigate('students')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Total Students</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              {metrics.totalStudents}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{hasPeriod ? `Joined in ${periodLabel}` : 'Enrolled overall'}</span>
          </div>

          {/* 2. Active Students */}
          <div 
            onClick={() => onNavigate('students')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Active Students</span>
              <UserCheck className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-700 tabular-nums">
              {metrics.activeStudents}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Currently training</span>
          </div>

          {/* 3. Completed Students */}
          <div 
            onClick={() => onNavigate('students')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Completed</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-700 tabular-nums">
              {metrics.completedStudents}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Graduated</span>
          </div>

          {/* 4. Total Trainers */}
          <div 
            onClick={() => onNavigate('trainers')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Total Trainers</span>
              <GraduationCap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              {metrics.totalTrainers}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{departmentFilter === 'all' ? 'All departments' : departmentLabel}</span>
          </div>

          {/* 5. Total Revenue */}
          <div 
            onClick={() => onNavigate('payments')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Total Revenue</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">{hasPeriod ? 'Fees billed in period' : 'Total course bookings'}</span>
          </div>

          {/* 6. Amount Collected */}
          <div 
            onClick={() => onNavigate('payments')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Collected</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 tabular-nums">
              {formatCurrency(metrics.amountCollected)}
            </div>
            <span className="text-[10px] text-emerald-600 block mt-0.5">{hasPeriod ? 'Received in period' : 'Valid payments'}</span>
          </div>

          {/* 7. Total Outstanding */}
          <div 
            onClick={() => onNavigate('installments')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Total Outstanding</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl font-bold text-red-700 tabular-nums">
              {formatCurrency(metrics.totalOutstanding)}
            </div>
            <span className="text-[10px] text-red-600 block mt-0.5">{hasPeriod ? 'Unpaid on period dues' : 'Remaining uncollected'}</span>
          </div>

          {/* 8. Partial Payments */}
          <div 
            onClick={() => onNavigate('installments')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Partial Payments</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-700 tabular-nums">
              {metrics.partialPaymentsCount}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Partially settled</span>
          </div>

          {/* 9. Students With Dues */}
          <div 
            onClick={() => onNavigate('installments')}
            className="bg-white p-3.5 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs hover:border-red-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-red-700 mb-1">
              <span className="text-[11px] font-bold uppercase">Students With Dues</span>
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl font-bold text-red-700 tabular-nums">
              {metrics.studentsWithDuesCount}
            </div>
            <span className="text-[10px] text-red-600 block mt-0.5 font-medium">Pending collection</span>
          </div>

        </div>
      </div>

      {/* Section 3: Charts & Overviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Payment Overview & Monthly Collections */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment & Collection Overview</h3>
              <p className="text-[11px] text-slate-500">
                Revenue vs Amount Collected vs Total Outstanding
              </p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1"
            >
              Ledger <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Collection Rate</span>
                <span className="font-bold text-emerald-700">
                  {metrics.totalRevenue > 0
                    ? `${Math.min(100, Math.round((metrics.amountCollected / metrics.totalRevenue) * 100))}% Collected`
                    : 'Nothing billed in this period'}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-600 h-full transition-all" 
                  style={{ width: `${metrics.totalRevenue > 0 ? Math.min(100, (metrics.amountCollected / metrics.totalRevenue) * 100) : 0}%` }} 
                />
                <div 
                  className="bg-red-500 h-full transition-all" 
                  style={{ width: `${metrics.totalRevenue > 0 ? Math.min(100, (metrics.totalOutstanding / metrics.totalRevenue) * 100) : 0}%` }} 
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Collected: {formatCurrency(metrics.amountCollected)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Outstanding: {formatCurrency(metrics.totalOutstanding)}
                </span>
              </div>
            </div>

            {/* Monthly Trend Bars */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Monthly Collections Trend
              </span>
              <div
                className="grid gap-2 text-center"
                style={{ gridTemplateColumns: `repeat(${metrics.monthlyCollections.length}, minmax(0, 1fr))` }}
              >
                {metrics.monthlyCollections.map((m) => {
                  const maxAmt = Math.max(1, ...metrics.monthlyCollections.map(x => x.amount));
                  const barHeight = Math.min(100, Math.round((m.amount / maxAmt) * 100));
                  return (
                    <div key={m.month} className="flex flex-col items-center">
                      <div className="h-28 w-full bg-slate-50 rounded-lg flex items-end justify-center p-1">
                        <div 
                          className="w-full bg-blue-700 rounded transition-all hover:bg-blue-800"
                          style={{ height: `${m.amount > 0 ? Math.max(8, barHeight) : 2}%` }}
                          title={`${m.month}: ${formatCurrency(m.amount)}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 mt-2 truncate w-full">
                        {metrics.monthlyCollections.length > 6 ? m.month.split(' ')[0] : m.month}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-900 tabular-nums truncate w-full">
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Chart 2: Course Distribution & Student Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Course Distribution</h3>
            <p className="text-[11px] text-slate-500">Student enrollment by course · {departmentLabel}</p>
          </div>

          <div className="space-y-3">
            {metrics.courseBreakdown.length === 0 && (
              <p className="text-xs text-slate-500">No courses in this department yet.</p>
            )}
            {metrics.courseBreakdown.map((c, idx) => {
              const colors = ['bg-blue-700', 'bg-amber-600', 'bg-sky-500', 'bg-emerald-600', 'bg-purple-600', 'bg-slate-600'];
              return (
                <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center text-xs gap-2">
                    <span className="font-bold text-slate-800 truncate">{c.name}</span>
                    <span className="font-extrabold text-slate-900 tabular-nums shrink-0">{c.students} Students</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`${colors[idx % colors.length]} h-full`}
                      style={{ width: `${(c.students / (metrics.totalStudents || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Fee: {formatCurrency(c.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student Status Summary */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Student Status Overview
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-blue-50/60 border border-blue-100">
                <span className="text-slate-600">Active</span>
                <span className="font-bold text-blue-800">{metrics.activeStudents}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-emerald-50/60 border border-emerald-100">
                <span className="text-slate-600">Completed</span>
                <span className="font-bold text-emerald-800">{metrics.completedStudents}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-amber-50/60 border border-amber-100">
                <span className="text-slate-600">On Hold</span>
                <span className="font-bold text-amber-800">{metrics.onHoldStudents}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-red-50/60 border border-red-100">
                <span className="text-slate-600">Dropped</span>
                <span className="font-bold text-red-800">{metrics.droppedStudents}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department-wise summary (follows the period filter) */}
      {isAdmin && departmentFilter === 'all' && departments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-700" /> Department-wise Summary
              </h3>
              <p className="text-[11px] text-slate-500">{periodLabel} · click a row to focus the dashboard on it</p>
            </div>
            <button onClick={() => onNavigate('departments')} className="text-xs font-semibold text-blue-700 hover:underline">
              Departments &rarr;
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Department</th>
                  <th className="py-2 px-3 font-semibold text-right">Students</th>
                  <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                  <th className="py-2 px-3 font-semibold text-right">Collected</th>
                  <th className="py-2 pl-3 font-semibold text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((d) => {
                  const m = db.getDashboardMetrics({ department: d.id, ...range });
                  return (
                    <tr key={d.id} onClick={() => setDepartmentFilter(d.id)} className="hover:bg-slate-50 cursor-pointer">
                      <td className="py-2 pr-3 font-semibold text-slate-800">{d.name}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{m.totalStudents}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(m.totalRevenue)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-emerald-700 font-semibold">{formatCurrency(m.amountCollected)}</td>
                      <td className="py-2 pl-3 text-right tabular-nums text-red-700 font-semibold">{formatCurrency(m.totalOutstanding)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Recent Activity & Audit Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Academy Activity & Audit Trail</h3>
            <p className="text-[11px] text-slate-500">Live transaction and admission events</p>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
          >
            Audit Log &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  log.action.includes('PAYMENT') ? 'bg-emerald-500' :
                  log.action.includes('ONBOARD') ? 'bg-red-600' :
                  log.action.includes('LEAVE') ? 'bg-amber-500' :
                  'bg-blue-500'
                }`} />
                <div>
                  <span className="font-bold text-slate-900 mr-1.5">
                    {log.user_name}
                  </span>
                  <span className="text-slate-700">
                    {log.new_value || log.action}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Entity: {log.entity} · ID: {log.entity_id}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                {new Date(log.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short'
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
