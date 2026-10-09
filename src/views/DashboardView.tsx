import React, { useState } from 'react';
import { 
  Users, UserCheck, GraduationCap, DollarSign, CreditCard, 
  AlertTriangle, Clock, TrendingUp, Calendar, CheckCircle, 
  ArrowUpRight, Plus, ExternalLink, ShieldAlert, Lock
} from 'lucide-react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, DueBadge } from '../components/StatusBadges';
import { NavTab } from '../components/Sidebar';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

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

  const metrics = db.getDashboardMetrics();
  const recentLogs = db.getAuditLogs().slice(0, 6);
  const students = db.getStudents(currentUser.role, currentUser.id);
  const leaves = db.getLeaves(currentUser.role, currentUser.id);
  const upcomingSchedules = db.getSchedules(currentUser.role, currentUser.id).slice(0, 4);

  // Student portal customized view
  if (isStudent) {
    const student = students[0];
    const installments = student ? db.getInstallments(student.id) : [];
    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-xl p-6 text-white border border-slate-800 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Student Learning Portal
              </span>
              <h2 className="text-xl font-bold mt-1">
                Welcome back, {student?.full_name || currentUser.name}!
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Enrolled in <strong className="text-white">{student?.course_name}</strong> · Faculty: <strong className="text-white">{student?.trainer_name}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedStudentInstallmentId(undefined);
                  setIsStudentPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
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

        {/* Installment Tracker Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Your Installments Plan</h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Installment amounts are fixed for student payments (Admin editable only)</span>
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedStudentInstallmentId(undefined);
                setIsStudentPaymentModalOpen(true);
              }}
              className="text-xs font-semibold text-red-700 hover:underline"
            >
              Pay Now &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {installments.map((inst) => (
              <div key={inst.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{inst.name || `Installment ${inst.installment_number}`}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                      inst.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      inst.status === 'partially_paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {inst.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{inst.month}</div>
                  <div className="mt-2 text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(inst.installment_amount)}
                  </div>
                  <div className="mt-1 text-xs flex justify-between">
                    <span className="text-slate-500">Due:</span>
                    <span className={inst.due_amount > 0 ? 'font-bold text-red-600' : 'text-slate-500'}>
                      {formatCurrency(inst.due_amount)}
                    </span>
                  </div>
                </div>

                {inst.due_amount > 0 ? (
                  <button
                    onClick={() => {
                      setSelectedStudentInstallmentId(inst.id);
                      setIsStudentPaymentModalOpen(true);
                    }}
                    className="mt-3 w-full py-1.5 px-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Due ({formatCurrency(inst.due_amount)})</span>
                  </button>
                ) : (
                  <div className="mt-3 text-center py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded border border-emerald-100 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Cleared</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

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

        {/* Upcoming Classes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Upcoming Class Sessions</h3>
          {upcomingSchedules.length === 0 ? (
            <p className="text-xs text-slate-500">No scheduled classes at the moment.</p>
          ) : (
            <div className="space-y-2">
              {upcomingSchedules.map((sch) => (
                <div key={sch.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-3 rounded-lg border border-slate-100 bg-slate-50 gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sch.title}</h4>
                    <p className="text-[11px] text-slate-500">{sch.topic} · Trainer: {sch.trainer_name}</p>
                    <span className="text-[10px] text-red-700 font-semibold font-mono">
                      {sch.class_date} ({sch.start_time} - {sch.end_time})
                    </span>
                  </div>
                  <a
                    href={sch.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors self-start sm:self-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Join Google Meet
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin and Trainer Dashboards
  return (
    <div className="space-y-6">
      {/* Top Welcome / Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-xl p-5 sm:p-6 text-white border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
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
                className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                + Onboard New Student
              </button>
              <button
                onClick={() => onNavigate('installments')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition-colors"
              >
                View Dues Tracker
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: 10 KPI Cards */}
      <div>
       
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
            <span className="text-[10px] text-slate-400 block mt-0.5">Enrolled overall</span>
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
            <span className="text-[10px] text-slate-400 block mt-0.5">Full Stack & AI Faculty</span>
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
            <span className="text-[10px] text-slate-400 block mt-0.5">Total course bookings</span>
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
            <span className="text-[10px] text-emerald-600 block mt-0.5">Valid payments</span>
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
            <span className="text-[10px] text-red-600 block mt-0.5">Remaining uncollected</span>
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

          {/* 10. Pending Leave Requests */}
          <div 
            onClick={() => onNavigate('leaves')}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase">Pending Leaves</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-700 tabular-nums">
              {metrics.pendingLeaveRequests}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">Awaiting approval</span>
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
              className="text-xs font-semibold text-red-700 hover:underline flex items-center gap-1"
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
                  {Math.round((metrics.amountCollected / (metrics.totalRevenue || 1)) * 100)}% Collected
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-600 h-full transition-all" 
                  style={{ width: `${(metrics.amountCollected / (metrics.totalRevenue || 1)) * 100}%` }} 
                />
                <div 
                  className="bg-red-500 h-full transition-all" 
                  style={{ width: `${(metrics.totalOutstanding / (metrics.totalRevenue || 1)) * 100}%` }} 
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
              <div className="grid grid-cols-5 gap-2 text-center">
                {metrics.monthlyCollections.map((m) => {
                  const maxAmt = 30000;
                  const barHeight = Math.min(100, Math.round((m.amount / maxAmt) * 100));
                  return (
                    <div key={m.month} className="flex flex-col items-center">
                      <div className="h-28 w-full bg-slate-50 rounded-lg flex items-end justify-center p-1">
                        <div 
                          className="w-full bg-red-700 rounded transition-all hover:bg-red-800"
                          style={{ height: `${Math.max(15, barHeight)}%` }}
                          title={`${m.month}: ${formatCurrency(m.amount)}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 mt-2 truncate w-full">
                        {m.month}
                      </span>
                      <span className="text-[10px] font-bold text-slate-900 tabular-nums">
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
            <p className="text-[11px] text-slate-500">Student enrollment by technical branch</p>
          </div>

          <div className="space-y-3">
            {/* Full Stack */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Full Stack Development</span>
                <span className="font-extrabold text-red-700 tabular-nums">{metrics.fullStackCount} Students</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-red-700 h-full" 
                  style={{ width: `${(metrics.fullStackCount / (metrics.totalStudents || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Fee: ₹30,000</span>
                <span>4-5 Months</span>
              </div>
            </div>

            {/* AI/ML */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">AI / Machine Learning</span>
                <span className="font-extrabold text-amber-700 tabular-nums">{metrics.aimlCount} Students</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-amber-600 h-full" 
                  style={{ width: `${(metrics.aimlCount / (metrics.totalStudents || 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Fee: ₹35,000</span>
                <span>4-5 Months</span>
              </div>
            </div>
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
                <span className="font-bold text-amber-800">0</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-red-50/60 border border-red-100">
                <span className="text-slate-600">Dropped</span>
                <span className="font-bold text-red-800">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Activity & Audit Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Academy Activity & Audit Trail</h3>
            <p className="text-[11px] text-slate-500">Live transaction, leave, and admission events</p>
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
