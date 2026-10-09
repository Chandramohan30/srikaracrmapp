import React, { useState } from 'react';
import { GraduationCap, Users, Plus, Mail, Phone, Calendar, Clock, Edit, X, Check, BookOpen } from 'lucide-react';
import { Trainer, Student } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';

export const TrainersView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState<Trainer | null>(null);
  const [showAddTrainerModal, setShowAddTrainerModal] = useState(false);

  // New trainer form
  const [newTrainerForm, setNewTrainerForm] = useState({
    trainer_code: '',
    name: '',
    email: '',
    phone: '',
    specialization: 'Full Stack Web Development',
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

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Trainer Master & Faculty Directory
          </h2>
         
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddTrainerModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Onboard New Trainer
          </button>
        )}
      </div>

      {/* Trainers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {trainers.map((trainer) => {
          const assignedStudents = students.filter(s => s.trainer_id === trainer.id);
          return (
            <div 
              key={trainer.id}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-red-700 font-extrabold flex items-center justify-center text-sm border border-slate-200">
                      {trainer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-900">
                          {trainer.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-400">
                          {trainer.trainer_code}
                        </span>
                      </div>
                      <p className="text-xs text-red-700 font-medium">
                        {trainer.specialization}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    trainer.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {trainer.status}
                  </span>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{trainer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{trainer.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Experience: {trainer.experience} · Joined: {trainer.joining_date}</span>
                  </div>
                </div>

                {/* Skills badges */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1.5">
                    Technical Core Skills
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {trainer.skills.map((sk) => (
                      <span key={sk} className="text-[10px] font-mono font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom footer with assigned count */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-900">{assignedStudents.length}</span> Assigned Student(s)
                </div>

                <button
                  onClick={() => setSelectedTrainerDetails(trainer)}
                  className="text-xs font-semibold text-red-700 hover:underline"
                >
                  View Assigned Roster &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- ASSIGNED STUDENTS ROSTER MODAL --- */}
      {selectedTrainerDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Students Assigned to {selectedTrainerDetails.name}
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedTrainerDetails.specialization}
                </span>
              </div>
              <button
                onClick={() => setSelectedTrainerDetails(null)}
                className="p-1 text-slate-400 hover:text-white"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Onboard Faculty Trainer
                </h3>
              </div>
              <button
                onClick={() => setShowAddTrainerModal(false)}
                className="p-1 text-slate-400 hover:text-white"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Experience</label>
                  <input
                    type="text"
                    placeholder="e.g. 6+ Years"
                    value={newTrainerForm.experience}
                    onChange={(e) => setNewTrainerForm({ ...newTrainerForm, experience: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specialization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI/ML Deep Learning or Full Stack Node/React"
                  value={newTrainerForm.specialization}
                  onChange={(e) => setNewTrainerForm({ ...newTrainerForm, specialization: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Core Skills (Comma separated)</label>
                <input
                  type="text"
                  placeholder="Python, PyTorch, React, SQL"
                  value={newTrainerForm.skillsStr}
                  onChange={(e) => setNewTrainerForm({ ...newTrainerForm, skillsStr: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
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
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
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
