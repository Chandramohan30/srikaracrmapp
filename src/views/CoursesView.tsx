import React, { useState } from 'react';
import { BookOpen, Plus, Edit, Check, X, Users, DollarSign, Clock } from 'lucide-react';
import { Course } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../components/StatusBadges';

export const CoursesView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New course form
  const [newCourse, setNewCourse] = useState({
    course_code: '',
    course_name: '',
    description: '',
    duration: '4–5 Months',
    base_price: 30000,
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
        status: 'active'
      });
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Course Master & Tuition Pricing
          </h2>
        
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Course
          </button>
        )}
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {courses.map((course) => {
          const enrolledCount = db.getStudents().filter(s => s.course_id === course.id).length;
          return (
            <div 
              key={course.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                      {course.course_code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {course.course_name}
                    </h3>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    course.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {course.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                  {course.description}
                </p>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Course Duration
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {course.duration}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Enrolled Students
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {enrolledCount} active / alumni
                    </span>
                  </div>
                </div>
              </div>

              {/* Price & Action footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Base Tuition Fee
                  </span>
                  <span className="text-xl font-black text-red-700 tabular-nums">
                    {formatCurrency(course.base_price)}
                  </span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setEditingCourse({ ...course })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Price / Details
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- EDIT COURSE MODAL --- */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Course Master
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {editingCourse.course_code}
                </span>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 text-slate-400 hover:text-white"
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
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-600 tabular-nums"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingCourse.status}
                    onChange={(e) => setEditingCourse({ ...editingCourse, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCourse.description}
                  onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Add New Course Master
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="w-full p-2 border border-slate-300 rounded font-bold text-slate-900 outline-none focus:ring-1 focus:ring-red-600 tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Course curriculum and career placement coverage..."
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
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
