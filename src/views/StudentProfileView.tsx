import React, { useState } from 'react';
import { 
  User, BookOpen, GraduationCap, CreditCard, Clock, 
  MapPin, Phone, Mail, Award, CheckCircle, Lock 
} from 'lucide-react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, DueBadge, StudentPaymentStatusBadge, StudentStatusBadge } from '../components/StatusBadges';
import { StudentInstallmentsTable } from '../components/StudentInstallmentsTable';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

export const StudentProfileView: React.FC = () => {
  const { currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | undefined>(undefined);

  const students = db.getStudents('student', currentUser.id);
  const student = students[0];

  if (!student) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
        No student profile linked to this user account.
      </div>
    );
  }

  const installments = db.getInstallments(student.id);

  const handleOpenPayModal = (installmentId?: string) => {
    setSelectedInstallmentId(installmentId);
    setShowPaymentModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 font-black text-2xl flex items-center justify-center border border-slate-200 shrink-0">
              {student.first_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {student.full_name}
                </h2>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {student.student_code}
                </span>
              </div>
              <p className="text-xs text-blue-700 font-semibold mt-0.5">
                {student.course_name}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {student.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {student.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {student.city}, {student.state}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <StudentStatusBadge status={student.status} />
            <button
              onClick={() => handleOpenPayModal(undefined)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              Pay / View Installments
            </button>
          </div>
        </div>
      </div>

      {/* Academic & Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Academic Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="pb-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              Academic & Faculty Details
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded">
              <span className="text-slate-500">Enrolled Course:</span>
              <span className="font-bold text-slate-900">{student.course_name}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded">
              <span className="text-slate-500">Assigned Faculty:</span>
              <span className="font-bold text-slate-900">{student.trainer_name}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded">
              <span className="text-slate-500">Joining Date:</span>
              <span className="font-mono text-slate-900">{student.joining_date}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded">
              <span className="text-slate-500">Expected Completion:</span>
              <span className="font-mono text-slate-900">{student.expected_completion_date}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded">
              <span className="text-slate-500">Qualification:</span>
              <span className="font-medium text-slate-900">{student.qualification} ({student.college || 'N/A'}, {student.passing_year || ''})</span>
            </div>
          </div>
        </div>

        {/* Financial Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="pb-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              Fee & Installment Summary
            </h3>
            <StudentPaymentStatusBadge status={student.payment_status} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-slate-50 rounded border">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Tuition</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">{formatCurrency(student.total_course_amount)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Paid</span>
              <span className="font-bold text-emerald-800 text-sm mt-0.5 block">{formatCurrency(student.total_paid)}</span>
            </div>
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <span className="text-[10px] text-red-700 uppercase font-semibold block">Balance Due</span>
              <span className="font-bold text-red-700 text-sm mt-0.5 block">{formatCurrency(student.total_outstanding)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Installment plan (sub-installments shown under their installment) */}
      <StudentInstallmentsTable installments={installments} onPay={(id) => handleOpenPayModal(id)} />

      {/* Payment Modal */}
      {showPaymentModal && (
        <StudentPaymentModal
          student={student}
          isOpen={showPaymentModal}
          initialInstallmentId={selectedInstallmentId}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInstallmentId(undefined);
          }}
          onDataChanged={() => {
            setRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
};
