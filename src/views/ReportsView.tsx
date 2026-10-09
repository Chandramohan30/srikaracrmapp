import React from 'react';
import { FileText, Download, Printer, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';
import { formatCurrency } from '../components/StatusBadges';
import { SrikaraLogo } from '../components/SrikaraLogo';

export const ReportsView: React.FC = () => {
  const metrics = db.getDashboardMetrics();
  const students = db.getStudents();
  const payments = db.getPayments();
  const courses = db.getCourses();
  const trainers = db.getTrainers();

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Student ID', 'Student Name', 'Course', 'Trainer', 'Joining Date',
      'Course Amount', 'Paid Amount', 'Outstanding Due', 'Payment Status', 'Status'
    ];
    const rows = students.map(s => [
      s.student_code,
      `"${s.full_name}"`,
      `"${s.course_name}"`,
      `"${s.trainer_name}"`,
      s.joining_date,
      s.total_course_amount,
      s.total_paid,
      s.total_outstanding,
      s.payment_status,
      s.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Srikara_Academy_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Academy Financial & Operational Reports
          </h2>
          <p className="text-xs text-slate-500">
            Audit-grade reporting on student admissions, fee collections, and overdue receivables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Gross Course Billings</span>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <span className="text-xs text-slate-500 block mt-1">From {metrics.totalStudents} total student admissions</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Realized Collections</span>
          <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
            {formatCurrency(metrics.amountCollected)}
          </div>
          <span className="text-xs text-emerald-600 block mt-1">
            {Math.round((metrics.amountCollected / (metrics.totalRevenue || 1)) * 100)}% realization rate
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Outstanding Receivables</span>
          <div className="text-2xl font-black text-red-700 mt-1 tabular-nums">
            {formatCurrency(metrics.totalOutstanding)}
          </div>
          <span className="text-xs text-red-600 block mt-1">Dues across pending installments</span>
        </div>
      </div>

      {/* Course-Wise Collection Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Course-Wise Financial Performance</span>
          <span className="text-slate-400 font-normal">Active Master Data</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
            <tr>
              <th className="py-2.5 px-4">Course Name</th>
              <th className="py-2.5 px-4 text-right">Base Tuition</th>
              <th className="py-2.5 px-4 text-center">Enrolled</th>
              <th className="py-2.5 px-4 text-right">Total Billed</th>
              <th className="py-2.5 px-4 text-right">Collected</th>
              <th className="py-2.5 px-4 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((crs) => {
              const enrolled = students.filter(s => s.course_id === crs.id);
              const billed = enrolled.reduce((sum, s) => sum + s.total_course_amount, 0);
              const collected = enrolled.reduce((sum, s) => sum + s.total_paid, 0);
              const outstanding = billed - collected;

              return (
                <tr key={crs.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{crs.course_name}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700 tabular-nums">{formatCurrency(crs.base_price)}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">{enrolled.length}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(billed)}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">{formatCurrency(collected)}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600 tabular-nums">{formatCurrency(outstanding)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Students Outstanding Aging Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs font-bold text-slate-800">
          <span>Outstanding Dues Roster (Defaulters & Partial Payers)</span>
          <span className="text-red-700 font-mono">
            {students.filter(s => s.total_outstanding > 0).length} Student(s) with balance
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b">
            <tr>
              <th className="py-2.5 px-4">Student ID & Name</th>
              <th className="py-2.5 px-4">Phone</th>
              <th className="py-2.5 px-4">Course</th>
              <th className="py-2.5 px-4 text-right">Fee</th>
              <th className="py-2.5 px-4 text-right">Paid</th>
              <th className="py-2.5 px-4 text-right">Outstanding Due</th>
              <th className="py-2.5 px-4">Payment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.filter(s => s.total_outstanding > 0).map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/70">
                <td className="py-3 px-4 font-bold text-slate-900">
                  {s.full_name} <span className="font-mono text-[10px] text-slate-400 font-normal">({s.student_code})</span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">{s.phone}</td>
                <td className="py-3 px-4 text-slate-700">{s.course_name}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(s.total_course_amount)}</td>
                <td className="py-3 px-4 text-right font-bold text-emerald-700 tabular-nums">{formatCurrency(s.total_paid)}</td>
                <td className="py-3 px-4 text-right font-bold text-red-600 tabular-nums">{formatCurrency(s.total_outstanding)}</td>
                <td className="py-3 px-4 uppercase font-semibold text-[10px] text-amber-700">{s.payment_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
