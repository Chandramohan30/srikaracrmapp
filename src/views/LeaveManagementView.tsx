import React, { useState } from 'react';
import { 
  UserCheck, Plus, CheckCircle, XCircle, AlertCircle, 
  Calendar, Clock, MessageSquare, X 
} from 'lucide-react';
import { LeaveApplication } from '../types/crm';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { LeaveStatusBadge } from '../components/StatusBadges';

export const LeaveManagementView: React.FC = () => {
  const { currentUser, isAdmin, isTrainer, isStudent } = useAuth();
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [remarksModalLeave, setRemarksModalLeave] = useState<LeaveApplication | null>(null);
  const [adminAction, setAdminAction] = useState<'approve' | 'reject'>('approve');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Apply form state
  const [applyForm, setApplyForm] = useState({
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const [applyError, setApplyError] = useState<string | null>(null);

  const reloadData = () => {
    setLeaves(db.getLeaves(currentUser.role, currentUser.id));
  };

  React.useEffect(() => {
    reloadData();
  }, [currentUser]);

  // Handle student apply leave
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    try {
      const student = db.getStudents().find(s => s.user_id === currentUser.id || s.id === currentUser.id);
      if (!student) {
        throw new Error('Current user is not mapped to an active student record.');
      }
      await db.applyLeave({
        student_id: student.id,
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        reason: applyForm.reason
      }, currentUser);

      setShowApplyModal(false);
      setApplyForm({
        from_date: new Date().toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        reason: ''
      });
      reloadData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit leave request');
    }
  };

  // Handle Admin Approve / Reject
  const handleExecuteApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarksModalLeave) return;
    try {
      if (adminAction === 'approve') {
        await db.approveLeave(remarksModalLeave.id, adminRemarks, currentUser);
      } else {
        await db.rejectLeave(remarksModalLeave.id, adminRemarks, currentUser);
      }
      setRemarksModalLeave(null);
      setAdminRemarks('');
      reloadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Leave Management Portal
            </h2>
            {pendingLeaves.length > 0 && (
              <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                {pendingLeaves.length} Pending
              </span>
            )}
          </div>
          
        </div>

        {/* Student can apply */}
        {isStudent && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            + Apply for Leave
          </button>
        )}
      </div>

      {/* Leaves Listing Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Leave Requests ({leaves.length})
          </span>
          {isAdmin && (
            <span className="text-slate-500 font-medium">
              Admin controls enabled
            </span>
          )}
        </div>

        {leaves.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No leave applications recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Student</th>
                  <th className="py-3 px-3.5">Date Range</th>
                  <th className="py-3 px-3.5 text-center">Days</th>
                  <th className="py-3 px-3.5">Reason</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">Admin Remarks</th>
                  <th className="py-3 px-3.5">Approved By</th>
                  {isAdmin && <th className="py-3 px-3.5 text-center">Admin Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div>{leave.student_name}</div>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        {leave.student_code}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 text-slate-700 font-mono">
                      {leave.from_date} <span className="text-slate-400">&rarr;</span> {leave.to_date}
                    </td>

                    <td className="py-3 px-3.5 text-center font-bold text-slate-800">
                      {leave.days} day(s)
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate">
                      {leave.reason}
                    </td>

                    <td className="py-3 px-3.5">
                      <LeaveStatusBadge status={leave.status} />
                    </td>

                    <td className="py-3 px-3.5 text-slate-600 italic">
                      {leave.admin_remarks || '—'}
                    </td>

                    <td className="py-3 px-3.5 text-slate-500 text-[11px]">
                      {leave.approved_by || '—'}
                    </td>

                    {/* Admin Actions: Approve or Reject (Rule 17 & 26) */}
                    {isAdmin && (
                      <td className="py-3 px-3.5 text-center">
                        {leave.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setRemarksModalLeave(leave);
                                setAdminAction('approve');
                                setAdminRemarks('Approved. Catch up on recorded lectures.');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRemarksModalLeave(leave);
                                setAdminAction('reject');
                                setAdminRemarks('Cannot approve due to scheduled project test.');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Processed
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- STUDENT APPLY LEAVE MODAL --- */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Apply for Leave
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-5 space-y-3 text-xs">
              {applyError && (
                <div className="p-2.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.from_date}
                    onChange={(e) => setApplyForm({ ...applyForm, from_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.to_date}
                    onChange={(e) => setApplyForm({ ...applyForm, to_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain reason for absence..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white font-semibold bg-red-700 hover:bg-red-800 rounded shadow-xs"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN APPROVE/REJECT REMARKS MODAL --- */}
      {remarksModalLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className={`px-5 py-4 text-white flex items-center justify-between ${
              adminAction === 'approve' ? 'bg-emerald-700' : 'bg-red-700'
            }`}>
              <h3 className="text-base font-bold text-white">
                {adminAction === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setRemarksModalLeave(null)} className="p-1 text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteApproval} className="p-5 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border rounded text-slate-700">
                <span className="font-bold text-slate-900">{remarksModalLeave.student_name}</span> ({remarksModalLeave.student_code})
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Duration: {remarksModalLeave.from_date} to {remarksModalLeave.to_date} ({remarksModalLeave.days} days)
                </div>
                <div className="text-[11px] text-slate-700 mt-1 italic">
                  "{remarksModalLeave.reason}"
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Admin Remarks / Advice *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setRemarksModalLeave(null)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-white font-semibold rounded shadow-xs ${
                    adminAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Confirm {adminAction === 'approve' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
