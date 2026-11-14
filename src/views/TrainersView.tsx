import React, { useState } from 'react';
import { Plus, Edit, X, Check, Trash2 } from 'lucide-react';
import { DataTable, Column, IconAction, PrimaryButton, StatusPill, filterSelectCls } from '../components/DataTable';

const fieldCls = 'w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600';
import { Trainer, Student } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface TrainersViewProps {
  initialDepartmentId?: string;
}

export const TrainersView: React.FC<TrainersViewProps> = ({ initialDepartmentId = 'all' }) => {
  const { currentUser, isAdmin } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState<Trainer | null>(null);
  const [showAddTrainerModal, setShowAddTrainerModal] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null);
  const [editSkills, setEditSkills] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(initialDepartmentId);
  const departments = db.getDepartments();

  // New trainer form
  const [newTrainerForm, setNewTrainerForm] = useState({
    trainer_code: '',
    name: '',
    email: '',
    phone: '',
    specialization: 'Full Stack Web Development',
    department_id: '',
    experience: '5+ Years',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active' as Trainer['status'],
    skillsStr: 'React, Node.js, TypeScript, PostgreSQL'
  });

  const reloadData = () => {
    setTrainers(db.getTrainers());
    setStudents(db.getStudents());
  };

  React.useEffect(() => {
    reloadData();
  }, []);

  const handleAddTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const skills = newTrainerForm.skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      // Leave Trainer ID blank to auto-generate (TRN-001, TRN-002 ...)
      const created = await db.createTrainer({
        trainer_code: newTrainerForm.trainer_code,
        name: newTrainerForm.name,
        email: newTrainerForm.email,
        phone: newTrainerForm.phone,
        specialization: newTrainerForm.specialization,
        department_id: newTrainerForm.department_id,
        experience: newTrainerForm.experience,
        joining_date: newTrainerForm.joining_date,
        status: newTrainerForm.status,
        skills,
        user_id: ''
      }, currentUser);
      window.alert(
        `Trainer onboarded successfully!\n\nLogin Email: ${created.email}\nPassword (Trainer ID): ${created.trainer_code}`
      );
      setShowAddTrainerModal(false);
      setNewTrainerForm({
        trainer_code: '',
        name: '',
        email: '',
        phone: '',
        specialization: 'Full Stack Web Development',
        department_id: '',
        experience: '5+ Years',
        joining_date: new Date().toISOString().split('T')[0],
        status: 'active',
        skillsStr: 'React, Node.js, TypeScript, PostgreSQL'
      });
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const assigned = (t: Trainer) => students.filter(s => s.trainer_id === t.id).length;
  const visible = trainers.filter(t => departmentFilter === 'all' || t.department_id === departmentFilter);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainer) return;
    try {
      await db.updateTrainer(editingTrainer.id, {
        name: editingTrainer.name,
        email: editingTrainer.email,
        phone: editingTrainer.phone,
        specialization: editingTrainer.specialization,
        experience: editingTrainer.experience,
        department_id: editingTrainer.department_id || '',
        status: editingTrainer.status,
        skills: editSkills.split(',').map(x => x.trim()).filter(Boolean)
      }, currentUser);
      setEditingTrainer(null);
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: Column<Trainer>[] = [
    {
      key: 'name', header: 'Trainer',
      render: (t) => (
        <div>
          <div className="font-semibold text-slate-900">{t.name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{t.trainer_code}</div>
        </div>
      ),
      exportValue: (t) => `${t.name} (${t.trainer_code})`
    },
    {
      key: 'email', header: 'Contact',
      render: (t) => (
        <div>
          <div className="text-slate-800">{t.phone}</div>
          <div className="text-[10px] text-slate-400">{t.email}</div>
        </div>
      )
    },
    { key: 'department_name', header: 'Department', render: (t) => t.department_name || <span className="text-slate-300">Unassigned</span> },
    { key: 'specialization', header: 'Specialization', render: (t) => <span className="text-slate-800">{t.specialization}</span> },
    { key: 'experience', header: 'Experience' },
    { key: 'joining_date', header: 'Joined', render: (t) => <span className="tabular-nums text-slate-500">{t.joining_date}</span> },
    {
      key: 'assigned', header: 'Students', align: 'center', sortValue: assigned,
      render: (t) => <span className="inline-flex min-w-8 h-7 px-2 items-center justify-center rounded-md bg-blue-50 text-blue-700 font-semibold tabular-nums">{assigned(t)}</span>
    },
    { key: 'status', header: 'Status', render: (t) => <StatusPill status={t.status} /> }
  ];

  return (
    <div className="space-y-6">
      <DataTable<Trainer>
        title="Trainers"
        subtitle="Click a trainer to see the students assigned to them"
        rows={visible}
        columns={columns}
        getRowId={(t) => t.id}
        searchText={(t) => `${t.name} ${t.trainer_code} ${t.email} ${t.phone} ${t.specialization} ${t.skills.join(' ')}`}
        searchPlaceholder="Search trainers…"
        exportFileName="trainers"
        initialSort={{ key: 'name', dir: 'asc' }}
        onRowClick={(t) => setSelectedTrainerDetails(t)}
        actions={isAdmin ? <PrimaryButton onClick={() => setShowAddTrainerModal(true)} icon={<Plus className="w-4 h-4" />}>Add Trainer</PrimaryButton> : undefined}
        toolbar={departments.length > 0 ? (
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={filterSelectCls} aria-label="Department">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : undefined}
        rowActions={isAdmin ? (trainer) => (
          <>
            <IconAction title="Edit trainer" onClick={() => { setEditingTrainer({ ...trainer }); setEditSkills(trainer.skills.join(', ')); }}>
              <Edit className="w-4 h-4" />
            </IconAction>
            <IconAction
              title="Delete trainer"
              tone="danger"
              onClick={async () => {
                if (!window.confirm(`Delete trainer ${trainer.name} (${trainer.trainer_code})? Their login will be removed.`)) return;
                try { await db.deleteTrainer(trainer.id); reloadData(); } catch (err: any) { alert(err.message); }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </IconAction>
          </>
        ) : undefined}
        emptyText="No trainers yet."
      />

      {/* --- EDIT TRAINER MODAL --- */}
      {editingTrainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Edit Trainer</h3>
                <span className="text-xs text-blue-100 font-mono">{editingTrainer.trainer_code}</span>
              </div>
              <button onClick={() => setEditingTrainer(null)} className="p-1 text-blue-100 hover:text-white" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input required value={editingTrainer.name} onChange={(e) => setEditingTrainer({ ...editingTrainer, name: e.target.value })} className={fieldCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input type="email" required value={editingTrainer.email} onChange={(e) => setEditingTrainer({ ...editingTrainer, email: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input required value={editingTrainer.phone} onChange={(e) => setEditingTrainer({ ...editingTrainer, phone: e.target.value })} className={fieldCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select value={editingTrainer.department_id || ''} onChange={(e) => setEditingTrainer({ ...editingTrainer, department_id: e.target.value })} className={fieldCls}>
                    <option value="">Unassigned</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select value={editingTrainer.status} onChange={(e) => setEditingTrainer({ ...editingTrainer, status: e.target.value as Trainer['status'] })} className={fieldCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialization</label>
                  <input value={editingTrainer.specialization} onChange={(e) => setEditingTrainer({ ...editingTrainer, specialization: e.target.value })} className={fieldCls} />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Experience</label>
                  <input value={editingTrainer.experience} onChange={(e) => setEditingTrainer({ ...editingTrainer, experience: e.target.value })} className={fieldCls} />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Skills (comma separated)</label>
                <input value={editSkills} onChange={(e) => setEditSkills(e.target.value)} className={fieldCls} />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setEditingTrainer(null)} className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-4 py-1.5 text-white font-semibold bg-blue-600 hover:bg-blue-700 rounded">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ASSIGNED STUDENTS ROSTER MODAL --- */}
      {selectedTrainerDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Students Assigned to {selectedTrainerDetails.name}
                </h3>
                <span className="text-xs text-blue-100">
                  {selectedTrainerDetails.specialization}
                </span>
              </div>
              <button
                onClick={() => setSelectedTrainerDetails(null)}
                className="p-1 text-blue-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-2 text-xs">
              {students.filter(s => s.trainer_id === selectedTrainerDetails.id).length === 0 ? (
                <p className="text-slate-500 text-center py-4">No students currently assigned to this faculty.</p>
              ) : (
                students.filter(s => s.trainer_id === selectedTrainerDetails.id).map((std) => (
                  <div key={std.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{std.full_name}</div>
                      <div className="text-[11px] text-slate-500">{std.student_code} · {std.course_name}</div>
                      <div className="text-[10px] text-slate-400">{std.phone} · Joined: {std.joining_date}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                      {std.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button
                onClick={() => setSelectedTrainerDetails(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD NEW TRAINER MODAL --- */}
      {showAddTrainerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-blue-950/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-800 to-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Onboard Faculty Trainer
                </h3>
              </div>
              <button
                onClick={() => setShowAddTrainerModal(false)}
                className="p-1 text-blue-100 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTrainerSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trainer Code</label>
                  <input
                    type="text"
                    placeholder="TRN-003"
                    value={newTrainerForm.trainer_code}
                    onChange={(e) => setNewTrainerForm({ ...newTrainerForm, trainer_code: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Experience</label>
                  <input
                    type="text"
                    placeholder="e.g. 6+ Years"
                    value={newTrainerForm.experience}
                    onChange={(e) => setNewTrainerForm({ ...newTrainerForm, experience: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={newTrainerForm.name}
                  onChange={(e) => setNewTrainerForm({ ...newTrainerForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="trainer@srikaraacademy.com"
                    value={newTrainerForm.email}
                    onChange={(e) => setNewTrainerForm({ ...newTrainerForm, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98403 12345"
                    value={newTrainerForm.phone}
                    onChange={(e) => setNewTrainerForm({ ...newTrainerForm, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  required
                  value={newTrainerForm.department_id}
                  onChange={(e) => setNewTrainerForm({ ...newTrainerForm, department_id: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">Select department…</option>
                  {departments.filter(d => d.status === 'active').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI/ML Deep Learning or Full Stack Node/React"
                  value={newTrainerForm.specialization}
                  onChange={(e) => setNewTrainerForm({ ...newTrainerForm, specialization: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Core Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Python, PyTorch, React, SQL"
                  value={newTrainerForm.skillsStr}
                  onChange={(e) => setNewTrainerForm({ ...newTrainerForm, skillsStr: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddTrainerModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-blue-700 hover:bg-blue-800 rounded shadow-xs"
                >
                  Save Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
