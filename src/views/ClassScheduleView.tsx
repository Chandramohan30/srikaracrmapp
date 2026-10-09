import React, { useState } from 'react';
import { 
  CalendarClock, Plus, Calendar as CalendarIcon, Video, 
  ExternalLink, Download, Trash2, Edit, X, Clock, User, 
  BookOpen, Check, AlertCircle 
} from 'lucide-react';
import { ClassSchedule, Student, Trainer } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { googleCalendar } from '../services/calendarService';

interface ClassScheduleViewProps {
  initialStudentId?: string;
}

export const ClassScheduleView: React.FC<ClassScheduleViewProps> = ({ initialStudentId }) => {
  const { currentUser, isAdmin, isTrainer, isStudent } = useAuth();
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  // Calendar View Filter: month, week, day
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day' | 'list'>('list');

  // Schedule modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);

  // New schedule form
  const [scheduleForm, setScheduleForm] = useState({
    student_id: initialStudentId || '',
    trainer_id: '',
    title: '',
    topic: '',
    class_date: new Date().toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '20:00',
    meeting_url: '',
    notes: ''
  });

  const reloadData = () => {
    const schs = db.getSchedules(currentUser.role, currentUser.id);
    const stds = db.getStudents(currentUser.role, currentUser.id);
    const trns = db.getTrainers();

    setSchedules(schs);
    setStudents(stds);
    setTrainers(trns);

    // Default trainer
    if (isTrainer) {
      const currentTrainer = trns.find(t => t.user_id === currentUser.id || t.id === currentUser.trainer_id);
      if (currentTrainer) {
        setScheduleForm(prev => ({ ...prev, trainer_id: currentTrainer.id }));
      }
    } else if (trns.length > 0 && !scheduleForm.trainer_id) {
      setScheduleForm(prev => ({ ...prev, trainer_id: trns[0].id }));
    }

    if (stds.length > 0 && !scheduleForm.student_id) {
      setScheduleForm(prev => ({ ...prev, student_id: initialStudentId || stds[0].id }));
    }
  };

  React.useEffect(() => {
    reloadData();
  }, [currentUser]);

  // Handle Create Schedule
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const meetUrl = scheduleForm.meeting_url || googleCalendar.generateMeetUrl('srk');
      
      await db.createSchedule({
        ...scheduleForm,
        meeting_url: meetUrl
      }, currentUser);

      setShowAddModal(false);
      setScheduleForm({
        student_id: students[0]?.id || '',
        trainer_id: scheduleForm.trainer_id,
        title: '',
        topic: '',
        class_date: new Date().toISOString().split('T')[0],
        start_time: '18:00',
        end_time: '20:00',
        meeting_url: '',
        notes: ''
      });
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle Delete
  const handleDelete = async (sch: ClassSchedule) => {
    if (window.confirm(`Are you sure you want to remove the class schedule "${sch.title}"?`)) {
      try {
        await db.deleteSchedule(sch.id, currentUser);
        reloadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Class Timetable & Google Calendar Synchronization
            </h2>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 uppercase">
              G-Meet Integrated
            </span>
          </div>
         
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <div className="bg-slate-100 p-1 rounded-lg flex items-center text-xs font-semibold">
            <button
              onClick={() => setCalendarView('list')}
              className={`px-3 py-1 rounded transition-colors ${
                calendarView === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agenda List
            </button>
            <button
              onClick={() => setCalendarView('month')}
              className={`px-3 py-1 rounded transition-colors ${
                calendarView === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Month View
            </button>
          </div>

          {(isAdmin || isTrainer) && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Schedule Class
            </button>
          )}
        </div>
      </div>

      {/* Main Schedule Content */}
      {calendarView === 'list' ? (
        /* Agenda List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Upcoming Training Sessions ({schedules.length})
            </span>
            <span className="text-slate-500">
              Google Calendar Sync Active
            </span>
          </div>

          {schedules.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No class schedules found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {schedules.map((sch) => {
                const gcalUrl = googleCalendar.generateGoogleCalendarWebUrl({
                  title: sch.title,
                  topic: sch.topic,
                  date: sch.class_date,
                  startTime: sch.start_time,
                  endTime: sch.end_time,
                  studentName: sch.student_name,
                  trainerName: sch.trainer_name,
                  meetingUrl: sch.meeting_url,
                  notes: sch.notes
                });

                return (
                  <div key={sch.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {sch.class_date} · {sch.start_time} - {sch.end_time}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {sch.title}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        Topic: {sch.topic}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Student: <strong className="text-slate-800">{sch.student_name}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Trainer: <strong className="text-slate-800">{sch.trainer_name}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                          Course: <strong className="text-slate-800">{sch.course_name}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Direct Google Meet Join */}
                      <a
                        href={sch.meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Join Meet
                      </a>

                      {/* Add to Google Calendar 1-Click */}
                      <a
                        href={gcalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-red-600" />
                        Add to G-Cal
                      </a>

                      {/* Download .ics iCalendar file */}
                      <button
                        onClick={() => googleCalendar.downloadIcsFile(sch)}
                        title="Download .ics iCalendar file"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Delete (Admin or Trainer) */}
                      {(isAdmin || isTrainer) && (
                        <button
                          onClick={() => handleDelete(sch)}
                          title="Remove Class Schedule"
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Month Calendar View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b">
            <h3 className="text-sm font-bold text-slate-900">
              October 2026 Academic Calendar View
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              3 Classes Scheduled This Month
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="font-bold text-slate-500 py-2 bg-slate-50 rounded">
                {d}
              </div>
            ))}
            {/* Simple month grid representation */}
            {Array.from({ length: 31 }, (_, i) => {
              const dayNum = i + 1;
              const dateStr = `2026-10-${String(dayNum).padStart(2, '0')}`;
              const daySchedules = schedules.filter(s => s.class_date === dateStr);
              return (
                <div 
                  key={dayNum} 
                  className={`min-h-[70px] p-1.5 rounded-lg border text-left flex flex-col justify-between ${
                    daySchedules.length > 0 ? 'bg-red-50/40 border-red-200' : 'bg-white border-slate-100'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${
                    daySchedules.length > 0 ? 'text-red-700' : 'text-slate-600'
                  }`}>
                    {dayNum}
                  </span>
                  {daySchedules.map(ds => (
                    <div 
                      key={ds.id} 
                      className="text-[9px] font-semibold bg-red-700 text-white p-1 rounded truncate leading-tight mt-1"
                      title={`${ds.title} (${ds.start_time})`}
                    >
                      {ds.start_time} {ds.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ADD SCHEDULE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Schedule Class Session
                </h3>
                
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Student *</label>
                  <select
                    required
                    value={scheduleForm.student_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, student_id: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.course_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Faculty / Trainer *</label>
                  <select
                    disabled={isTrainer}
                    required
                    value={scheduleForm.trainer_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, trainer_id: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-red-600 bg-white"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Stack System Architecture & DB Design"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lecture Topic & Agenda *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PostgreSQL foreign keys, indexing, and connection pools"
                  value={scheduleForm.topic}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, topic: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.class_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, class_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Meet Link (Optional)</label>
                <input
                  type="url"
                  placeholder="Leave empty to auto-generate: https://meet.google.com/srk-xxxx-xxx"
                  value={scheduleForm.meeting_url}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, meeting_url: e.target.value })}
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
                  Save & Sync Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
