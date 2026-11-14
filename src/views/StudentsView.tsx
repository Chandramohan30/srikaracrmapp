import React, { useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Student, Course, Trainer, StudentStatus } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, StudentPaymentStatusBadge, StudentStatusBadge } from '../components/StatusBadges';
import { DataTable, Column, IconAction, PrimaryButton, filterSelectCls } from '../components/DataTable';
import { StudentPaymentModal } from '../components/StudentPaymentModal';

interface StudentsViewProps {
  onOpenOnboardModal: () => void;
  initialDepartmentId?: string;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  onOpenOnboardModal,
  initialDepartmentId = 'all'
}) => {
  const { currentUser, isAdmin, isTrainer } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  // Filters (search box lives in the table)
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState(initialDepartmentId);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedPaymentStatusFilter, setSelectedPaymentStatusFilter] = useState('all');

  // Modals state
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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
    // Filters
    const matchesDepartment = selectedDepartmentFilter === 'all' || s.department_id === selectedDepartmentFilter;
    const matchesCourse = selectedCourseFilter === 'all' || s.course_id === selectedCourseFilter;
    const matchesTrainer = selectedTrainerFilter === 'all' || s.trainer_id === selectedTrainerFilter;
    const matchesStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;
    const matchesPaymentStatus = 
      selectedPaymentStatusFilter === 'all' || s.payment_status === selectedPaymentStatusFilter;

    return matchesDepartment && matchesCourse && matchesTrainer && matchesStatus && matchesPaymentStatus;
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

  const departments = db.getDepartments();
  const filtersActive =
    selectedDepartmentFilter !== 'all' || selectedCourseFilter !== 'all' || selectedTrainerFilter !== 'all' ||
    selectedStatusFilter !== 'all' || selectedPaymentStatusFilter !== 'all';

  const columns: Column<Student>[] = [
    {
      key: 'full_name',
      header: 'Student',
      render: (s) => (
        <div>
          <div className="font-semibold text-slate-900">{s.full_name}</div>
          <div className="text-[10px] text-slate-400"><span className="font-mono">{s.student_code}</span> · {s.phone}</div>
        </div>
      ),
      exportValue: (s) => `${s.full_name} (${s.student_code}) ${s.phone} ${s.email}`
    },
    {
      key: 'course_name', header: 'Course / Trainer',
      exportValue: (s) => `${s.course_name} | ${s.department_name || ''} | ${s.trainer_name}`,
      render: (s) => (
        <div>
          <div className="font-medium text-slate-800">{s.course_name}</div>
          <div className="text-[10px] text-slate-400">{[s.department_name, s.trainer_name].filter(Boolean).join(' · ')}</div>
        </div>
      )
    },
    { key: 'joining_date', header: 'Joined', render: (s) => <span className="tabular-nums text-slate-500">{s.joining_date}</span> },
    { key: 'status', header: 'Status', render: (s) => <StudentStatusBadge status={s.status} /> },
    {
      key: 'total_course_amount', header: 'Fee', align: 'right',
      render: (s) => <span className="tabular-nums font-semibold text-slate-900">{formatCurrency(s.total_course_amount)}</span>
    },
    {
      key: 'total_paid', header: 'Paid', align: 'right',
      render: (s) => <span className="tabular-nums font-semibold text-emerald-700">{formatCurrency(s.total_paid)}</span>
    },
    {
      key: 'total_outstanding', header: 'Outstanding', align: 'right',
      render: (s) => s.total_outstanding > 0
        ? <span className="tabular-nums font-bold text-red-600">{formatCurrency(s.total_outstanding)}</span>
        : <span className="tabular-nums text-slate-400">₹0</span>
    },
    { key: 'payment_status', header: 'Payment', render: (s) => <StudentPaymentStatusBadge status={s.payment_status} /> }
  ];

  return (
    <div className="space-y-5">
      <DataTable<Student>
        title="Student Records"
        subtitle="Click a student to see their installments and payment history"
        rows={filteredStudents}
        columns={columns}
        getRowId={(s) => s.id}
        searchText={(s) => `${s.full_name} ${s.student_code} ${s.phone} ${s.email} ${s.course_name} ${s.trainer_name}`}
        searchPlaceholder="Search name, ID, phone, email…"
        exportFileName="students"
        initialSort={{ key: 'joining_date', dir: 'desc' }}
        onRowClick={(s) => setSelectedStudentForPayment(s)}
        actions={isAdmin ? (
          <PrimaryButton onClick={onOpenOnboardModal} icon={<Plus className="w-4 h-4" />}>Onboard Student</PrimaryButton>
        ) : undefined}
        toolbar={
          <>
            {isAdmin && (
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => {
                  setSelectedDepartmentFilter(e.target.value);
                  setSelectedCourseFilter('all');
                  setSelectedTrainerFilter('all');
                }}
                className={filterSelectCls}
                aria-label="Department"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            )}
            <select value={selectedCourseFilter} onChange={(e) => setSelectedCourseFilter(e.target.value)} className={filterSelectCls} aria-label="Course">
              <option value="all">All Courses</option>
              {courses.filter(c => selectedDepartmentFilter === 'all' || c.department_id === selectedDepartmentFilter).map((c) => (
                <option key={c.id} value={c.id}>{c.course_name}</option>
              ))}
            </select>
            {isAdmin && (
              <select value={selectedTrainerFilter} onChange={(e) => setSelectedTrainerFilter(e.target.value)} className={filterSelectCls} aria-label="Trainer">
                <option value="all">All Trainers</option>
                {trainers.filter(t => selectedDepartmentFilter === 'all' || t.department_id === selectedDepartmentFilter).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className={filterSelectCls} aria-label="Student status">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
              <option value="dropped">Dropped</option>
              <option value="onboarding">Onboarding</option>
            </select>
            <select value={selectedPaymentStatusFilter} onChange={(e) => setSelectedPaymentStatusFilter(e.target.value)} className={filterSelectCls} aria-label="Payment status">
              <option value="all">All Payments</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="has_due">Has Due</option>
              <option value="not_paid">Not Paid</option>
            </select>
            {filtersActive && (
              <button
                onClick={() => {
                  setSelectedDepartmentFilter('all');
                  setSelectedCourseFilter('all');
                  setSelectedTrainerFilter('all');
                  setSelectedStatusFilter('all');
                  setSelectedPaymentStatusFilter('all');
                }}
                className="text-blue-700 font-semibold hover:underline text-[11px]"
              >
                Clear filters
              </button>
            )}
          </>
        }
        rowActions={isAdmin ? (std) => (
          <>
            <IconAction title="Edit student" onClick={() => setEditingStudent({ ...std })}>
              <Edit className="w-4 h-4" />
            </IconAction>
            <IconAction
              title="Delete student"
              tone="danger"
              onClick={async () => {
                if (!window.confirm(`Permanently delete ${std.full_name} (${std.student_code})?\n\nThis also deletes their installments, payments and login. This cannot be undone.`)) return;
                try { await db.deleteStudent(std.id); reloadData(); } catch (err: any) { alert(err.message); }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconAction>
          </>
        ) : undefined}
        emptyText="No students found."
      />

      {/* Payment history / installments for the clicked student */}
      {selectedStudentForPayment && (
        <StudentPaymentModal
          student={selectedStudentForPayment}
          isOpen={!!selectedStudentForPayment}
          onClose={() => setSelectedStudentForPayment(null)}
          onDataChanged={() => reloadData()}
        />
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Student Details
                </h3>
                <span className="text-xs text-blue-100 font-mono">
                  {editingStudent.student_code}
                </span>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 text-blue-100 hover:text-white"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editingStudent.email}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trainer</label>
                <select
                  value={editingStudent.trainer_id}
                  onChange={(e) => setEditingStudent({ ...editingStudent, trainer_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                >
                  {trainers
                    .filter(t => !editingStudent.department_id || !t.department_id || t.department_id === editingStudent.department_id || t.id === editingStudent.trainer_id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.trainer_code})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editingStudent.status}
                  onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as StudentStatus })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
                  className="px-4 py-1.5 text-white font-semibold bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
