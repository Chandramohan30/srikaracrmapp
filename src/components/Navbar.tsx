import React from 'react';
import { Menu, Plus, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavTab } from './Sidebar';

interface NavbarProps {
  currentTab: NavTab;
  onOpenSidebar: () => void;
  onOpenOnboardModal?: () => void;
  onRefreshData?: () => void;
}

const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Academy Overview', subtitle: 'Real-time KPI metrics, revenue, and active student enrollment' },
  students: { title: 'Student Master & Roster', subtitle: 'Manage student records, enrollment status, dues, and assignments' },
  courses: { title: 'Course Master', subtitle: 'Course curriculum definitions, duration, and base price configuration' },
  trainers: { title: 'Trainer Master', subtitle: 'Technical faculty profiles, specializations, and student allocations' },
  payments: { title: 'Payment Ledger', subtitle: 'Complete UPI transaction records, payment proofs, and receipts' },
  installments: { title: 'Installments & Dues Tracker', subtitle: 'Automated 3-month installment schedules and overdue payment tracking' },
  leaves: { title: 'Leave Management', subtitle: 'Student absence applications, faculty visibility, and administrative approvals' },
  schedules: { title: 'Class Timetable & Schedule', subtitle: 'Upcoming training sessions, Google Meet links, and lecture agendas' },
  calendar: { title: 'Google Calendar Integration', subtitle: 'Two-way synchronization between trainer timetable and Google Calendar' },
  reports: { title: 'Financial & Academy Reports', subtitle: 'Revenue forecasts, collection analytics, and student progress summaries' },
  settings: { title: 'System & Payment Settings', subtitle: 'Academy credentials, UPI collection details, and calendar configuration' },
  profile: { title: 'Student Profile', subtitle: 'Enrolled coursework, assigned trainer, and payment history' },
};

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenSidebar,
  onOpenOnboardModal,
  onRefreshData
}) => {
  const { currentUser, isAdmin, logout } = useAuth();

  const { title, subtitle } = tabTitles[currentTab] || { title: 'Dashboard', subtitle: '' };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200">
      {/* Left: Mobile Toggle & Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 text-slate-600 rounded-lg md:hidden hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-slate-900 leading-tight">
              {title}
            </h1>
            <span className="hidden sm:inline-block text-xs text-slate-400 font-normal">
              · Srikara CRM
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden md:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions, Refresh, User identity, Sign Out (NO profile switcher) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Onboard Student Button (Admin Only) */}
        {isAdmin && onOpenOnboardModal && (
          <button
            onClick={onOpenOnboardModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Onboard Student</span>
            <span className="sm:hidden">Onboard</span>
          </button>
        )}

        {/* Refresh Data */}
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            title="Refresh Database Data"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* User Identity Info Badge (Non-clickable, no switcher) */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${
            currentUser.role === 'admin' 
              ? 'bg-red-700' 
              : currentUser.role === 'trainer' 
              ? 'bg-amber-600' 
              : 'bg-emerald-600'
          }`}>
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <div className="font-semibold text-slate-900 leading-tight text-xs truncate max-w-[120px]">
              {currentUser.name}
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${
              currentUser.role === 'admin'
                ? 'text-red-700'
                : currentUser.role === 'trainer'
                ? 'text-amber-700'
                : 'text-emerald-700'
            }`}>
              {currentUser.role}
            </div>
          </div>
        </div>

        {/* Sign Out Button (Direct logout, redirects to login page) */}
        <button
          onClick={logout}
          title="Sign Out"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
