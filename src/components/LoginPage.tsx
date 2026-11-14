import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { SrikaraLogo } from './SrikaraLogo';
import { CrmIllustration } from './CrmIllustration';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/crm';

interface LoginPageProps {
  /** Called with the role the server returned, so the app can redirect to the right home page */
  onLoginSuccess?: (role: UserRole) => void;
}

// Email + password only. The role (admin / trainer / student) is read from the account
// on the server, so there is no role picker. Students & trainers use their Student ID /
// Trainer ID as the password.
export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) return setErrorMsg('Please enter your email address.');
    if (!password) return setErrorMsg('Please enter your password.');

    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);

    if (result.success && result.user) {
      onLoginSuccess?.(result.user.role);
    } else {
      setErrorMsg(result.error || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-white grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {/* LEFT: illustration panel */}
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 px-12 py-10">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute top-1/3 right-10 w-24 h-24 rounded-full border-2 border-white/15" />

        <CrmIllustration className="relative w-full max-w-xl drop-shadow-2xl" />

        <div className="relative mt-8 text-center text-white max-w-md">
          <h1 className="text-2xl font-bold tracking-tight">Admissions, classes &amp; fees — in one place</h1>
          <p className="mt-2 text-sm text-blue-100 leading-relaxed">
            Srikara CRM helps the academy track every student from enquiry to placement.
          </p>
        </div>
      </div>

      {/* RIGHT: sign-in form */}
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 flex items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="flex justify-center mb-6">
              <SrikaraLogo variant="horizontal" size="lg" />
            </div>

            <div className="text-center mb-7">
              <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Please sign in with your email and password to continue.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@srikaraacademy.com"
                    className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Students &amp; trainers: use your Student ID / Trainer ID as the password.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-wait text-white text-sm font-bold shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-slate-400 text-center mt-6">
              Forgot your password? Contact the academy admin.
            </p>
          </div>
        </div>

        <footer className="px-6 py-4 text-center text-[11px] text-slate-400 border-t border-slate-100">
          © {new Date().getFullYear()} Srikara Training &amp; Placement Academy, Coimbatore. All rights reserved.
        </footer>
      </div>
    </div>
  );
};
