import React, { useState } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { DataTable, Column, IconAction, PrimaryButton, StatusPill, CountLink } from '../components/DataTable';
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

  const columns: Column<Department>[] = [
    {
      key: 'code', header: 'Code',
      render: (d) => <span className="font-mono text-[11px] font-semibold text-slate-600">{d.code}</span>
    },
    {
      key: 'name', header: 'Department',
      render: (d) => (
        <div className="max-w-[280px]">
          <div className="font-semibold text-slate-900">{d.name}</div>
          {d.description && <div className="text-[10px] text-slate-400 truncate">{d.description}</div>}
        </div>
      )
    },
    {
      key: 'courses', header: 'Courses', align: 'center',
      sortValue: (d) => db.getDepartmentSummary(d.id).courses.length,
      render: (d) => <CountLink count={db.getDepartmentSummary(d.id).courses.length} title="Open courses" onClick={() => onOpenDepartmentLink('courses', d.id)} />
    },
    {
      key: 'students', header: 'Students', align: 'center',
      sortValue: (d) => db.getDepartmentSummary(d.id).students.length,
      render: (d) => <CountLink count={db.getDepartmentSummary(d.id).students.length} title="Open students" onClick={() => onOpenDepartmentLink('students', d.id)} />
    },
    {
      key: 'trainers', header: 'Trainers', align: 'center',
      sortValue: (d) => db.getDepartmentSummary(d.id).trainers.length,
      render: (d) => <CountLink count={db.getDepartmentSummary(d.id).trainers.length} title="Open trainers" onClick={() => onOpenDepartmentLink('trainers', d.id)} />
    },
    {
      key: 'totalFees', header: 'Total Fees', align: 'right',
      sortValue: (d) => db.getDepartmentSummary(d.id).totalFees,
      render: (d) => <span className="tabular-nums font-semibold text-slate-900">{formatCurrency(db.getDepartmentSummary(d.id).totalFees)}</span>
    },
    {
      key: 'collected', header: 'Collected', align: 'right',
      sortValue: (d) => db.getDepartmentSummary(d.id).collected,
      render: (d) => <span className="tabular-nums font-semibold text-emerald-700">{formatCurrency(db.getDepartmentSummary(d.id).collected)}</span>
    },
    {
      key: 'outstanding', header: 'Outstanding', align: 'right',
      sortValue: (d) => db.getDepartmentSummary(d.id).outstanding,
      render: (d) => <span className="tabular-nums font-semibold text-red-600">{formatCurrency(db.getDepartmentSummary(d.id).outstanding)}</span>
    },
    { key: 'status', header: 'Status', render: (d) => <StatusPill status={d.status} /> }
  ];

  return (
    <div className="space-y-6">
      <DataTable<Department>
        title="Departments"
        subtitle="Courses, trainers, students and fee collection per department. Click a count to open that list."
        rows={departments}
        columns={columns}
        getRowId={(d) => d.id}
        searchText={(d) => `${d.code} ${d.name} ${d.description || ''}`}
        searchPlaceholder="Search departments…"
        exportFileName="departments"
        initialSort={{ key: 'name', dir: 'asc' }}
        actions={isAdmin ? <PrimaryButton onClick={openAdd} icon={<Plus className="w-4 h-4" />}>Add Department</PrimaryButton> : undefined}
        rowActions={isAdmin ? (dept) => (
          <>
            <IconAction title="Edit department" onClick={() => openEdit(dept)}><Edit className="w-4 h-4" /></IconAction>
            <IconAction
              title="Delete department"
              tone="danger"
              onClick={async () => {
                if (!window.confirm(`Delete department "${dept.name}"?`)) return;
                try { await db.deleteDepartment(dept.id); setTick(t => t + 1); } catch (err: any) { alert(err.message); }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconAction>
          </>
        ) : undefined}
        emptyText="No departments yet. Create one, then assign courses and trainers to it."
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <h3 className="text-base font-bold">{editing ? 'Edit Department' : 'Add Department'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-blue-100 hover:text-white">
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code</label>
                  <input
                    type="text" value={form.code} placeholder="Auto" disabled={!!editing}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600 uppercase disabled:bg-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              {editing && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as Department['status'] })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="pt-2 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-1.5 text-white font-semibold bg-blue-700 hover:bg-blue-800 rounded shadow-xs disabled:opacity-60">
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
