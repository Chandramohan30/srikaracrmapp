import React from 'react';
import { 
  LayoutDashboard, Users, BookOpen, GraduationCap, CreditCard, 
  Settings, Clock, LogOut, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SrikaraLogo } from './SrikaraLogo';

export type NavTab = 
  | 'dashboard'
  | 'students'
  | 'departments'
  | 'courses'
  | 'trainers'
  | 'payments'
  | 'installments'
  | 'settings'
  | 'profile';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  duesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  duesCount = 0
}) => {
  const { currentUser, isAdmin, isTrainer, isStudent, logout } = useAuth();

  // Navigation Items per role according to Section 2
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'departments', label: 'Departments', icon: Building2 },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'courses', label: 'Courses', icon: BookOpen },
        { id: 'trainers', label: 'Trainers', icon: GraduationCap },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'installments', label: 'Installments', icon: Clock, badge: duesCount > 0 ? `${duesCount} Dues` : undefined, badgeColor: 'bg-red-100 text-red-700 border-red-200' },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];
    }

    if (isTrainer) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'students', label: 'My Students', icon: Users },
      ];
    }

    // Student
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'profile', label: 'My Profile', icon: Users },
      { id: 'courses', label: 'My Course', icon: BookOpen },
      { id: 'trainers', label: 'My Trainer', icon: GraduationCap },
      { id: 'payments', label: 'Payments', icon: CreditCard, badge: duesCount > 0 ? 'Due' : undefined, badgeColor: 'bg-red-100 text-red-700 border-red-200' },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-blue-950/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-white text-slate-700 border-r border-slate-200 shadow-[2px_0_12px_-6px_rgba(30,64,175,0.15)] transition-transform duration-200 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="px-4 py-3 flex items-center justify-center border-b border-slate-100">
          <SrikaraLogo variant="horizontal" size="lg" />
        </div>
        

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-1 space-y-0.5">
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
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
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
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs ${
              isAdmin ? 'bg-blue-600' : isTrainer ? 'bg-amber-600' : 'bg-emerald-600'
            }`}>
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">
                {currentUser.name}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                {currentUser.role}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="w-full mt-2.5 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
