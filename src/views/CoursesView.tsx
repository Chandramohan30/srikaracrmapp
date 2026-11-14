import React, { useState } from 'react';
import { Plus, Edit, Check, X, Trash2 } from 'lucide-react';
import { DataTable, Column, IconAction, PrimaryButton, StatusPill, filterSelectCls } from '../components/DataTable';
import { Course } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../components/StatusBadges';

interface CoursesViewProps {
  initialDepartmentId?: string;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ initialDepartmentId = 'all' }) => {
  const { currentUser, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartmentId);
  const departments = db.getDepartments();

  // New course form
  const [newCourse, setNewCourse] = useState({
    course_code: '',
    course_name: '',
    description: '',
    duration: '4–5 Months',
    base_price: 30000,
    department_id: '',
    status: 'active' as Course['status']
  });

  const reloadData = () => {
    setCourses(db.getCourses());
  };

  React.useEffect(() => {
    reloadData();
  }, []);

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      await db.updateCourse(editingCourse.id, {
        course_name: editingCourse.course_name,
        base_price: editingCourse.base_price,
        duration: editingCourse.duration,
        description: editingCourse.description,
        department_id: editingCourse.department_id || '',
        status: editingCourse.status
      }, currentUser);
      setEditingCourse(null);
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.createCourse(newCourse, currentUser);
      setShowAddModal(false);
      setNewCourse({
        course_code: '',
        course_name: '',
        description: '',
        duration: '4–5 Months',
        base_price: 30000,
        department_id: '',
        status: 'active'
      });
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const allStudents = db.getStudents();
  const enrolled = (c: Course) => allStudents.filter(s => s.course_id === c.id).length;
  const visible = courses.filter(c => departmentFilter === 'all' || c.department_id === departmentFilter);

  const columns: Column<Course>[] = [
    { key: 'course_code', header: 'Code', render: (c) => <span className="font-mono text-[11px] font-semibold text-slate-600">{c.course_code}</span> },
    {
      key: 'course_name', header: 'Course',
      render: (c) => (
        <div className="max-w-[300px]">
          <div className="font-semibold text-slate-900">{c.course_name}</div>
          {c.description && <div className="text-[10px] text-slate-400 truncate">{c.description}</div>}
        </div>
      )
    },
    { key: 'department_name', header: 'Department', render: (c) => c.department_name || <span className="text-slate-300">Unassigned</span> },
    { key: 'duration', header: 'Duration' },
    { key: 'enrolled', header: 'Students', align: 'center', sortValue: enrolled, render: (c) => <span className="tabular-nums font-semibold">{enrolled(c)}</span> },
    { key: 'base_price', header: 'Course Fee', align: 'right', render: (c) => <span className="tabular-nums font-bold text-slate-900">{formatCurrency(c.base_price)}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusPill status={c.status} /> }
  ];

  return (
    <div className="space-y-6">
      <DataTable<Course>
        title={isAdmin ? 'Courses & Fees' : 'Courses'}
        subtitle="Course list with duration and fee"
        rows={visible}
        columns={columns}
        getRowId={(c) => c.id}
        searchText={(c) => `${c.course_code} ${c.course_name} ${c.department_name || ''} ${c.description || ''}`}
        searchPlaceholder="Search courses…"
        exportFileName="courses"
        initialSort={{ key: 'course_name', dir: 'asc' }}
        actions={isAdmin ? <PrimaryButton onClick={() => setShowAddModal(true)} icon={<Plus className="w-4 h-4" />}>Add Course</PrimaryButton> : undefined}
        toolbar={departments.length > 0 ? (
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={filterSelectCls} aria-label="Department">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : undefined}
        rowActions={isAdmin ? (course) => (
          <>
            <IconAction title="Edit course" onClick={() => setEditingCourse({ ...course })}><Edit className="w-4 h-4" /></IconAction>
            <IconAction
              title="Delete course"
              tone="danger"
              onClick={async () => {
                if (!window.confirm(`Delete course "${course.course_name}"?`)) return;
                try { await db.deleteCourse(course.id); reloadData(); } catch (err: any) { alert(err.message); }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconAction>
          </>
        ) : undefined}
        emptyText="No courses yet."
      />

      {/* --- EDIT COURSE MODAL --- */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Course Master
                </h3>
                <span className="text-xs text-blue-100 font-mono">
                  {editingCourse.course_code}
                </span>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 text-blue-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  required
                  value={editingCourse.course_name}
                  onChange={(e) => setEditingCourse({ ...editingCourse, course_name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Base Tuition Price (INR) *
                </label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={editingCourse.base_price}
                  onChange={(e) => setEditingCourse({ ...editingCourse, base_price: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Future onboardings will divide this into 2 installments automatically.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={editingCourse.duration}
                    onChange={(e) => setEditingCourse({ ...editingCourse, duration: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingCourse.status}
                    onChange={(e) => setEditingCourse({ ...editingCourse, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={editingCourse.department_id || ''}
                  onChange={(e) => setEditingCourse({ ...editingCourse, department_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">— Unassigned —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD NEW COURSE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Add New Course Master
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-blue-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TALLY-301"
                    value={newCourse.course_code}
                    onChange={(e) => setNewCourse({ ...newCourse, course_code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    placeholder="3 Months"
                    value={newCourse.duration}
                    onChange={(e) => setNewCourse({ ...newCourse, duration: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Tally Prime + GST"
                  value={newCourse.course_name}
                  onChange={(e) => setNewCourse({ ...newCourse, course_name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Base Price (INR) *</label>
                <input
                  type="number"
                  required
                  min="1000"
                  step="500"
                  value={newCourse.base_price}
                  onChange={(e) => setNewCourse({ ...newCourse, base_price: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={newCourse.department_id}
                  onChange={(e) => setNewCourse({ ...newCourse, department_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">Select department…</option>
                  {departments.filter(d => d.status === 'active').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Course curriculum and career placement coverage..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
