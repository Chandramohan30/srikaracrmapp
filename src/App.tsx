import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { DepartmentsView } from './views/DepartmentsView';
import { CoursesView } from './views/CoursesView';
import { TrainersView } from './views/TrainersView';
import { PaymentsView } from './views/PaymentsView';
import { InstallmentsView } from './views/InstallmentsView';
import { LeaveManagementView } from './views/LeaveManagementView';
import { ClassScheduleView } from './views/ClassScheduleView';
import { GoogleCalendarView } from './views/GoogleCalendarView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { StudentProfileView } from './views/StudentProfileView';
import { StudentOnboardingModal } from './components/StudentOnboardingModal';
import { LoginPage } from './components/LoginPage';
import { db } from './services/db';
import { ChatBot } from './components/ChatBot';

const AppContent: React.FC = () => {
  const { currentUser, isAdmin, isTrainer, isStudent, isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [scheduleStudentFilter, setScheduleStudentFilter] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  // department chosen via a Departments-page link; Students / Courses / Trainers pages start filtered to it
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const refreshData = async () => {
    try {
      await db.load();
    } catch {
      /* keep showing the last loaded data */
    }
    setRefreshKey(prev => prev + 1);
  };

  // Restoring a saved session from the API
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Loading Srikara CRM...
      </div>
    );
  }

  // If not authenticated, show default Login Page as requested
  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLoginSuccess={(role) => {
          if (role === 'student') {
            setCurrentTab('profile');
          } else if (role === 'trainer') {
            setCurrentTab('dashboard');
          } else {
            setCurrentTab('dashboard');
          }
        }} 
      />
    );
  }

  // Compute live badge counts
  const pendingLeavesCount = db.getLeaves().filter(l => l.status === 'pending').length;
  const duesCount = db.getInstallments().filter(i => i.due_amount > 0).length;

  const handleRefresh = () => {
    refreshData();
  };

  const handleNavigateToSchedule = (studentId: string) => {
    setScheduleStudentFilter(studentId);
    setCurrentTab('schedules');
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Main Sidebar (Section 2) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setScheduleStudentFilter(undefined);
          setDepartmentFilter('all');
          refreshData(); // pull the latest data from MongoDB
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        pendingLeavesCount={pendingLeavesCount}
        duesCount={duesCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onOpenOnboardModal={isAdmin ? () => setIsOnboardModalOpen(true) : undefined}
          onRefreshData={handleRefresh}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div key={refreshKey} className="max-w-7xl mx-auto pb-12">
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigate={(tab) => setCurrentTab(tab)}
                onOpenOnboardModal={() => setIsOnboardModalOpen(true)}
              />
            )}

            {currentTab === 'departments' && (
              <DepartmentsView
                onOpenDepartmentLink={(tab, deptId) => {
                  setDepartmentFilter(deptId);
                  setCurrentTab(tab);
                }}
              />
            )}

            {currentTab === 'students' && (
              <StudentsView
                initialDepartmentId={departmentFilter}
                onOpenOnboardModal={() => setIsOnboardModalOpen(true)}
                onNavigateToSchedule={handleNavigateToSchedule}
              />
            )}

            {currentTab === 'courses' && <CoursesView initialDepartmentId={departmentFilter} />}

            {currentTab === 'trainers' && <TrainersView initialDepartmentId={departmentFilter} />}

            {currentTab === 'payments' && <PaymentsView />}

            {currentTab === 'installments' && <InstallmentsView />}

            {currentTab === 'leaves' && <LeaveManagementView />}

            {currentTab === 'schedules' && (
              <ClassScheduleView initialStudentId={scheduleStudentFilter} />
            )}

            {currentTab === 'calendar' && <GoogleCalendarView />}

            {currentTab === 'reports' && <ReportsView />}

            {currentTab === 'settings' && <SettingsView />}

            {currentTab === 'profile' && <StudentProfileView />}
          </div>
        </main>
      </div>


       {/* AI assistant: floating icon (bottom-right) that opens the chat window */}
      {currentUser?.role === 'admin' && <ChatBot />}

      {/* Global Student Onboarding Modal (5-Step Wizard) */}
      {isOnboardModalOpen && (
        <StudentOnboardingModal
          isOpen={isOnboardModalOpen}
          onClose={() => setIsOnboardModalOpen(false)}
          onSuccess={() => {
            handleRefresh();
            setCurrentTab('students');
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
