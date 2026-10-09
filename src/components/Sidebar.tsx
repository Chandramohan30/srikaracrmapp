import React from 'react';
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, CreditCard, 
  CalendarClock, Calendar, FileText, Settings, UserCheck, 
  Clock, ShieldAlert, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SrikaraLogo } from './SrikaraLogo';

export type NavTab = 
  | 'dashboard'
  | 'students'
  | 'courses'
  | 'trainers'
  | 'payments'
  | 'installments'
  | 'leaves'
  | 'schedules'
  | 'calendar'
  | 'reports'
  | 'settings'
  | 'profile';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingLeavesCount?: number;
  duesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  pendingLeavesCount = 0,
  duesCount = 0
}) => {
  const { currentUser, isAdmin, isTrainer, isStudent, logout } = useAuth();

  // Navigation Items per role according to Section 2
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'courses', label: 'Courses', icon: BookOpen },
        { id: 'trainers', label: 'Trainers', icon: GraduationCap },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'installments', label: 'Installments', icon: Clock, badge: duesCount > 0 ? `${duesCount} Dues` : undefined, badgeColor: 'bg-red-100 text-red-700 border-red-200' },
        { id: 'leaves', label: 'Leave Management', icon: UserCheck, badge: pendingLeavesCount > 0 ? `${pendingLeavesCount}` : undefined, badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
        { id: 'schedules', label: 'Class Schedule', icon: CalendarClock },
        { id: 'calendar', label: 'Google Calendar', icon: Calendar },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (isTrainer) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', label: 'My Students', icon: Users },
        { id: 'schedules', label: 'Class Schedule', icon: CalendarClock },
        { id: 'calendar', label: 'Google Calendar', icon: Calendar },
        { id: 'leaves', label: 'Leave Information', icon: UserCheck },
      ];
    }

    // Student
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'profile', label: 'My Profile', icon: Users },
      { id: 'courses', label: 'My Course', icon: BookOpen },
      { id: 'payments', label: 'Payments', icon: CreditCard, badge: duesCount > 0 ? 'Due' : undefined, badgeColor: 'bg-red-100 text-red-700 border-red-200' },
      { id: 'leaves', label: 'Leave', icon: UserCheck },
      { id: 'schedules', label: 'Class Schedule', icon: CalendarClock },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-100 border-r border-slate-800 transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <SrikaraLogo variant="horizontal" size="sm" theme="dark" />
        </div>

       
        
       

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id as NavTab);
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-700 text-white shadow-sm shadow-red-950/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Info & Sign Out (No profile switcher) */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
              isAdmin ? 'bg-red-700' : isTrainer ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                {currentUser.role}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full mt-2.5 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
