import React, { useState } from 'react';
import { 
  Shield, Mail, Lock, ArrowRight, AlertCircle, 
  GraduationCap, Users, Key
} from 'lucide-react';
import { SrikaraLogo } from './SrikaraLogo';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/crm';

// Only the Admin has a sample login. Students & trainers sign in with the
// email used at onboarding and their Student ID / Trainer ID as the password.
const defaultCredentials: Record<UserRole, { email: string; password: string; name: string; desc: string }> = {
  student: {
    email: '',
    password: '',
    name: 'Use your Student ID as password',
    desc: 'View course, timetable & pay installments'
  },
  trainer: {
    email: '',
    password: '',
    name: 'Use your Trainer ID as password',
    desc: 'Manage schedules & view assigned students'
  },
  admin: {
    email: '',
    password: '',
    name: 'Academy Admin',
    desc: 'Full academy control, fee master & settings'
  }
};

interface LoginPageProps {
  onLoginSuccess?: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [emailInput, setEmailInput] = useState<string>(defaultCredentials.student.email);
  const [passwordInput, setPasswordInput] = useState<string>(defaultCredentials.student.password);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setEmailInput(defaultCredentials[role].email);
    setPasswordInput(defaultCredentials[role].password);
    setErrorMsg(null);
  };

  const handleQuickSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmailInput(defaultCredentials[role].email);
    setPasswordInput(defaultCredentials[role].password);
    setErrorMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!emailInput.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(selectedRole, emailInput.trim(), passwordInput);
    setIsSubmitting(false);
    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(selectedRole);
      }
    } else {
      setErrorMsg(result.error || 'Invalid credentials. Please verify your role and email.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(185,28,28,0.22),rgba(15,23,42,0.95))] pointer-events-none" />

      <div className="relative w-full max-w-md my-auto space-y-5 z-10">
        {/* Srikara Academy Brand Header with Shield Logo */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-center">
          <SrikaraLogo variant="full" size="lg" theme="dark" />
        </div>

        {/* Clean Login Form Card */}
        <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl">
          <div className="mb-5 text-center">
            <h2 className="text-base font-bold text-white tracking-wide">
              Sign Ins
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your role and enter credentials to continue
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            {/* 1. Choose Role in Form */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-semibold">
                  Choose Role *
                </label>
                <span className="text-[10px] text-slate-400">
                  {defaultCredentials[selectedRole].name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* 1 Student */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedRole === 'student'
                      ? 'bg-emerald-950 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Users className={`w-4 h-4 ${selectedRole === 'student' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className="text-[11px]">Student</span>
                </button>

                {/* 1 Trainer */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('trainer')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedRole === 'trainer'
                      ? 'bg-amber-950 border-amber-500 text-white shadow-sm ring-1 ring-amber-500 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 ${selectedRole === 'trainer' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="text-[11px]">Trainer</span>
                </button>

                {/* 1 Admin */}
                <button
                  type="button"
                  onClick={() => handleRoleChange('admin')}
                  className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                    selectedRole === 'admin'
                      ? 'bg-red-950 border-red-500 text-white shadow-sm ring-1 ring-red-500 font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Shield className={`w-4 h-4 ${selectedRole === 'admin' ? 'text-red-400' : 'text-slate-500'}`} />
                  <span className="text-[11px]">Admin</span>
                </button>
              </div>
            </div>

            {/* 2. Email Address */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@srikaraacademy.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                />
              </div>
            </div>

            {/* 3. Password */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={selectedRole === 'admin' ? '••••••••' : selectedRole === 'student' ? 'Your Student ID (e.g. SRK-2026-001)' : 'Your Trainer ID (e.g. TRN-001)'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
                />
              </div>
            </div>

            {/* 4. Submit & Role Redirection Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 disabled:opacity-70 disabled:cursor-wait text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-4 ${
                selectedRole === 'admin'
                  ? 'bg-red-700 hover:bg-red-800'
                  : selectedRole === 'trainer'
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <span>
              Sign In 
              </span>
             
            </button>
          </form>

         
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <div>Srikara Training & Placement Academy · ISO Certified</div>
          <div className="text-slate-600">www.srikaraacademy.com</div>
        </div>
      </div>
    </div>
  );
};
