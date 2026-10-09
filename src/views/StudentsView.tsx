import React, { useState } from 'react';
import { 
  Search, Filter, Plus, CreditCard, Eye, Edit, UserCheck, 
  CalendarClock, X, Check, AlertCircle, Phone, Mail, MapPin, 
  GraduationCap, BookOpen, Clock, ChevronDown
} from 'lucide-react';
import { Student, Course, Trainer, StudentStatus, StudentPaymentStatus } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { 
  formatCurrency, DueBadge, StudentPaymentStatusBadge, 
  StudentStatusBadge 
} from '../components/StatusBadges';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

interface StudentsViewProps {
  onOpenOnboardModal: () => void;
  onNavigateToSchedule?: (studentId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onOpenOnboardModal,
  onNavigateToSchedule
}) => {
  const { currentUser, isAdmin, isTrainer } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  // Search & Filters (Section 34)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedPaymentStatusFilter, setSelectedPaymentStatusFilter] = useState('all');

  // Modals state
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [reassigningTrainerStudent, setReassigningTrainerStudent] = useState<Student | null>(null);
  const [newTrainerId, setNewTrainerId] = useState('');

  const reloadData = () => {
    setStudents(db.getStudents(currentUser.role, currentUser.id));
    setCourses(db.getCourses());
    setTrainers(db.getTrainers());
  };

  React.useEffect(() => {
    reloadData();
  }, [currentUser]);

  // Filter students based on search and filters
  const filteredStudents = students.filter((s) => {
    // Search
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery ||
      s.full_name.toLowerCase().includes(q) ||
      s.student_code.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.email.toLowerCase().includes(q);

    // Filters
    const matchesCourse = selectedCourseFilter === 'all' || s.course_id === selectedCourseFilter;
    const matchesTrainer = selectedTrainerFilter === 'all' || s.trainer_id === selectedTrainerFilter;
    const matchesStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
    const matchesPaymentStatus = 
      selectedPaymentStatusFilter === 'all' || s.payment_status === selectedPaymentStatusFilter;

    return matchesSearch && matchesCourse && matchesTrainer && matchesStatus && matchesPaymentStatus;
  });

  // Handle Edit Student submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await db.updateStudent(editingStudent.id, editingStudent, currentUser);
      setEditingStudent(null);
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Trainer Reassignment (Section 22)
  const handleReassignTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningTrainerStudent || !newTrainerId) return;
    try {
      await db.updateStudent(reassigningTrainerStudent.id, {
        trainer_id: newTrainerId
      }, currentUser);
      setReassigningTrainerStudent(null);
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, student ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Onboard Button (Admin only) */}
          {isAdmin && (
            <button
              onClick={onOpenOnboardModal}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Onboard Student
            </button>
          )}
        </div>

        {/* Section 34: Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px] uppercase mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Course filter */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.course_name}</option>
            ))}
          </select>

          {/* Trainer filter */}
          {isAdmin && (
            <select
              value={selectedTrainerFilter}
              onChange={(e) => setSelectedTrainerFilter(e.target.value)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
            >
              <option value="all">All Trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          {/* Student Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
          >
            <option value="all">All Student Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="dropped">Dropped</option>
            <option value="onboarding">Onboarding</option>
          </select>

          {/* Payment Status filter */}
          <select
            value={selectedPaymentStatusFilter}
            onChange={(e) => setSelectedPaymentStatusFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
          >
            <option value="all">All Payment Statuses</option>
            <option value="fully_paid">Fully Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="has_due">Has Due</option>
            <option value="not_paid">Not Paid</option>
          </select>

          {(selectedCourseFilter !== 'all' || selectedTrainerFilter !== 'all' || selectedStatusFilter !== 'all' || selectedPaymentStatusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCourseFilter('all');
                setSelectedTrainerFilter('all');
                setSelectedStatusFilter('all');
                setSelectedPaymentStatusFilter('all');
                setSearchQuery('');
              }}
              className="text-red-700 font-semibold hover:underline text-[11px] ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Section 31: Student Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-700">
            Student Records ({filteredStudents.length} of {students.length})
          </div>
         
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 text-xs">
            No students found matching current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Student ID & Name</th>
                  <th className="py-3 px-3.5">Phone / Contact</th>
                  <th className="py-3 px-3.5">Course</th>
                  <th className="py-3 px-3.5">Trainer</th>
                  <th className="py-3 px-3.5">Joining Date</th>
                  <th className="py-3 px-3.5">Student Status</th>
                  <th className="py-3 px-3.5 text-right">Course Fee</th>
                  <th className="py-3 px-3.5 text-right">Paid</th>
                  <th className="py-3 px-3.5 text-right">Outstanding</th>
                  <th className="py-3 px-3.5">Payment Status</th>
                  <th className="py-3 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student ID & Name */}
                    <td className="py-3 px-3.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {std.first_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 hover:text-red-700 cursor-pointer" onClick={() => setViewingStudent(std)}>
                            {std.full_name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {std.student_code}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3 px-3.5 text-slate-700 font-mono">
                      <div>{std.phone}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px] font-sans">
                        {std.email}
                      </div>
                    </td>

                    {/* Course */}
                    <td className="py-3 px-3.5 font-medium text-slate-800">
                      {std.course_name}
                    </td>

                    {/* Trainer */}
                    <td className="py-3 px-3.5 text-slate-700">
                      {std.trainer_name}
                    </td>

                    {/* Joining Date */}
                    <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                      {std.joining_date}
                    </td>

                    {/* Student Status */}
                    <td className="py-3 px-3.5">
                      <StudentStatusBadge status={std.status} />
                    </td>

                    {/* Course Amount */}
                    <td className="py-3 px-3.5 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(std.total_course_amount)}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(std.total_paid)}
                    </td>

                    {/* Outstanding (RED if has dues) */}
                    <td className="py-3 px-3.5 text-right tabular-nums">
                      {std.total_outstanding > 0 ? (
                        <span className="font-bold text-red-600">
                          {formatCurrency(std.total_outstanding)}
                        </span>
                      ) : (
                        <span className="text-slate-400">₹0</span>
                      )}
                    </td>

                    {/* Payment Status */}
                    <td className="py-3 px-3.5">
                      <StudentPaymentStatusBadge status={std.payment_status} />
                    </td>

                    {/* Section 31 & 32: Actions (👁 View, ✏ Edit, 💳 Payment, 👤 Trainer, 📅 Schedule) */}
                    <td className="py-3 px-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 👁 View */}
                        <button
                          onClick={() => setViewingStudent(std)}
                          title="View Student Profile"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* ✏ Edit (Admin Only) */}
                        {isAdmin && (
                          <button
                            onClick={() => setEditingStudent({ ...std })}
                            title="Edit Student Information"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* 💳 Payment (SECTION 32: VERY IMPORTANT) */}
                        <button
                          onClick={() => setSelectedStudentForPayment(std)}
                          title="Open Payment & Installment Details"
                          className="p-1.5 text-red-700 hover:text-white hover:bg-red-700 bg-red-50 border border-red-200 rounded transition-colors shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>

                        {/* 👤 Trainer Assignment (Admin Only) */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setReassigningTrainerStudent(std);
                              setNewTrainerId(std.trainer_id);
                            }}
                            title="Assign / Change Trainer"
                            className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* 📅 Schedule */}
                        {onNavigateToSchedule && (
                          <button
                            onClick={() => onNavigateToSchedule(std.id)}
                            title="View / Schedule Classes"
                            className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- PAYMENT MODAL (SECTION 32) --- */}
      {selectedStudentForPayment && (
        <StudentPaymentModal
          student={selectedStudentForPayment}
          isOpen={!!selectedStudentForPayment}
          onClose={() => setSelectedStudentForPayment(null)}
          onDataChanged={() => reloadData()}
        />
      )}

      {/* --- VIEW STUDENT PROFILE MODAL --- */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Student Record: {viewingStudent.full_name}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {viewingStudent.student_code}
                </span>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-semibold">Course:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingStudent.course_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Trainer:</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingStudent.trainer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Total Fee:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(viewingStudent.total_course_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Outstanding Due:</span>
                  <span className="font-bold text-red-600">{formatCurrency(viewingStudent.total_outstanding)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewingStudent.phone} {viewingStudent.alternate_phone ? `· Alt: ${viewingStudent.alternate_phone}` : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewingStudent.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewingStudent.address}, {viewingStudent.city}, {viewingStudent.state}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewingStudent.qualification} ({viewingStudent.college || 'N/A'}, {viewingStudent.passing_year || ''})</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Joined: {viewingStudent.joining_date} · Expected Completion: {viewingStudent.expected_completion_date}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  onClick={() => {
                    const s = viewingStudent;
                    setViewingStudent(null);
                    setSelectedStudentForPayment(s);
                  }}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded font-semibold text-xs flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  View Payments
                </button>
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Student Details
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {editingStudent.student_code}
                </span>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.first_name}
                    onChange={(e) => setEditingStudent({ 
                      ...editingStudent, 
                      first_name: e.target.value,
                      full_name: `${e.target.value} ${editingStudent.last_name}`
                    })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.last_name}
                    onChange={(e) => setEditingStudent({ 
                      ...editingStudent, 
                      last_name: e.target.value,
                      full_name: `${editingStudent.first_name} ${e.target.value}`
                    })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={editingStudent.phone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingStudent.status}
                  onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as StudentStatus })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="dropped">Dropped</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="lead">Lead</option>
                  <option value="onboarding">Onboarding</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REASSIGN TRAINER MODAL (Section 22) --- */}
      {reassigningTrainerStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Assign Technical Trainer
                </h3>
                <span className="text-xs text-slate-400">
                  {reassigningTrainerStudent.full_name} ({reassigningTrainerStudent.course_name})
                </span>
              </div>
              <button
                onClick={() => setReassigningTrainerStudent(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReassignTrainerSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Trainer
                </label>
                <select
                  value={newTrainerId}
                  onChange={(e) => setNewTrainerId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                >
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.trainer_code}) · {t.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setReassigningTrainerStudent(null)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
                >
                  Update Trainer Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
