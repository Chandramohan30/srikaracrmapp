import React, { useState } from 'react';
import { Building2, Plus, Edit, Trash2, X, Users, GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { Department } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../components/StatusBadges';

interface DepartmentsViewProps {
  /** Opens the Courses / Students / Trainers page filtered to this department */
  onOpenDepartmentLink: (tab: 'courses' | 'students' | 'trainers', departmentId: string) => void;
}

const emptyForm = { name: '', code: '', description: '', status: 'active' as Department['status'] };

export const DepartmentsView: React.FC<DepartmentsViewProps> = ({ onOpenDepartmentLink }) => {
  const { currentUser, isAdmin } = useAuth();
  const [, setTick] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const departments = db.getDepartments();

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({ name: d.name, code: d.code, description: d.description || '', status: d.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await db.updateDepartment(editing.id, { name: form.name, description: form.description, status: form.status }, currentUser);
      } else {
        await db.createDepartment(form, currentUser);
      }
      setShowModal(false);
      setTick(t => t + 1);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const linkBtn = 'flex items-center justify-between w-full px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-xs transition-colors group';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Departments</h2>
          <p className="text-xs text-slate-500">
            Group courses, trainers and students by department and track collections per department.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {departments.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No departments yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Create your first department, then assign courses and trainers to it.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {departments.map(dept => {
            const sum = db.getDepartmentSummary(dept.id);
            return (
              <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                      {dept.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-700" />
                      {dept.name}
                    </h3>
                    {dept.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      dept.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {dept.status}
                    </span>
                    {isAdmin && (
                      <button onClick={() => openEdit(dept)} className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg" title="Edit department">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete department "${dept.name}"?`)) return;
                          try { await db.deleteDepartment(dept.id); setTick(t => t + 1); } catch (err: any) { alert(err.message); }
                        }}
                        className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-lg"
                        title="Delete department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Department links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                  <button className={linkBtn} onClick={() => onOpenDepartmentLink('courses', dept.id)}>
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Courses
                    </span>
                    <span className="flex items-center gap-1 font-bold text-slate-900">
                      {sum.courses.length}<ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-red-600" />
                    </span>
                  </button>
                  <button className={linkBtn} onClick={() => onOpenDepartmentLink('students', dept.id)}>
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> Students
                    </span>
                    <span className="flex items-center gap-1 font-bold text-slate-900">
                      {sum.students.length}<ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-red-600" />
                    </span>
                  </button>
                  <button className={linkBtn} onClick={() => onOpenDepartmentLink('trainers', dept.id)}>
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> Trainers
                    </span>
                    <span className="flex items-center gap-1 font-bold text-slate-900">
                      {sum.trainers.length}<ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-red-600" />
                    </span>
                  </button>
                </div>

                {/* Department money */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Fees</span>
                    <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(sum.totalFees)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Collected</span>
                    <span className="font-bold text-emerald-700 tabular-nums">{formatCurrency(sum.collected)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Outstanding</span>
                    <span className="font-bold text-red-700 tabular-nums">{formatCurrency(sum.outstanding)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">{editing ? 'Edit Department' : 'Add Department'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                  <input
                    type="text" required value={form.name} placeholder="e.g. IT / Accounting"
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code</label>
                  <input
                    type="text" value={form.code} placeholder="Auto" disabled={!!editing}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600 uppercase disabled:bg-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
              {editing && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as Department['status'] })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs disabled:opacity-60">
                  {saving ? 'Saving…' : editing ? 'Save Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
