
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { msg } from '../api';

const inp =
  'w-full border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-sm bg-slate-50/70 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 focus:bg-white transition-all duration-200';

const fields = [
  ['name', 'Full Name', 'text', User],
  ['email', 'Email Address', 'email', Mail],
  ['phone', 'Phone Number (10 digits)', 'tel', Phone],
  ['branch', 'Branch', 'text', GraduationCap],
  ['semester', 'Semester', 'text', ClipboardCheck],
  ['collegeName', 'College Name', 'text', Building2],
];

const benefits = [
  {
    icon: ClipboardCheck,
    title: 'Skill Assessments',
    text: 'Take domain-specific technical assessments.',
  },
  {
    icon: GraduationCap,
    title: 'Internship Ready',
    text: 'Showcase your technical knowledge and skills.',
  },
  {
    icon: Trophy,
    title: 'Track Your Progress',
    text: 'Complete assessments and move forward confidently.',
  },
];

function AuthToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;

    const timeout = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timeout);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100%-2rem))] items-start gap-3 rounded-xl border p-4 shadow-lg ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}
    >
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="text-lg leading-4 opacity-70 hover:opacity-100"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

export default function AuthPage({ initialMode = 'login' }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(
    initialMode === 'register' || location.pathname === '/register'
      ? 'register'
      : 'login'
  );

  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const set = (key) => (e) => {
    setForm((value) => ({
      ...value,
      [key]: e.target.value,
    }));

  };

  useEffect(() => {
    setMode(
      initialMode === 'register' || location.pathname === '/register'
        ? 'register'
        : 'login'
    );
  }, [initialMode, location.pathname]);

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);
    setToast(null);

    try {
      if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          setToast({ message: 'Passwords do not match.', type: 'error' });
          setBusy(false);
          return;
        }

        const data = await register(form);

        setToast({
          message:
            data?.message ||
            'Registration successful. Please login to continue.',
          type: 'success',
        });

        setTimeout(() => {
          nav('/login', { replace: true });
        }, 1200);
      } else {
        const user = await login(form);

        nav(
          user.role === 'admin'
            ? '/admin'
            : user.domainId
              ? '/'
              : '/select-domain',
          { replace: true }
        );
      }
    } catch (error) {
      setToast({ message: msg(error), type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    const nextMode = mode === 'login' ? 'register' : 'login';

    setMode(nextMode);
    setToast(null);
    setForm({});
    setShowPassword(false);
    setShowConfirmPassword(false);

    nav(nextMode === 'register' ? '/register' : '/login', {
      replace: true,
    });
  };

  const passwordLength = (form.password || '').length;
  const passwordStrong = passwordLength >= 8;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <AuthToast toast={toast} onDismiss={() => setToast(null)} />

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-slate-700/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-800/40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left information panel */}
        <div className="hidden lg:flex bg-slate-800 text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/5 rounded-full" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-sm mb-8">
             
              VProTech Assessment Portal
            </div>

            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              {mode === 'login'
                ? 'Welcome back to your assessment journey.'
                : 'Start your journey toward your next opportunity.'}
            </h2>

            <p className="mt-5 text-slate-300 leading-7 max-w-md">
              Assess your technical skills, complete domain-specific tests,
              and take the next step toward your internship and career goals.
            </p>

            <div className="mt-9 space-y-5">
              {benefits.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:bg-white/15 transition">
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative pt-10">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 size={17} />
              Secure authentication
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="p-6 sm:p-8 lg:p-10 xl:p-12">
          {/* Mobile branding */}
          <div className="lg:hidden mb-7">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-lg">
                <ShieldCheck size={23} />
              </div>

              <div>
                <h1 className="font-bold text-slate-900">
                  VProTech Assessment
                </h1>
                <p className="text-xs text-slate-500">
                  Student Portal
                </p>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-7">
            <div className="hidden lg:flex w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center mb-5">
              <ShieldCheck size={25} className="text-slate-700" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {mode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              {mode === 'login'
                ? 'Sign in to continue to your assessment dashboard.'
                : 'Create your student account and get started.'}
            </p>
          </div>

          {/* Mode switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex mb-7">
            <button
              type="button"
              onClick={() => {
                if (mode !== 'login') toggle();
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                if (mode !== 'register') toggle();
              }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Registration fields */}
            {mode === 'register' &&
              fields.map(([key, label, type, Icon]) => (
                <div key={key} className="relative">
                  <Icon
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />

                  <input
                    className={inp}
                    placeholder={label}
                    type={type || 'text'}
                    maxLength={key === 'phone' ? 10 : undefined}
                    inputMode={key === 'phone' ? 'numeric' : undefined}
                    pattern={key === 'phone' ? '[0-9]{10}' : undefined}
                    onInput={key === 'phone' ? (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10); } : undefined}
                    required
                    value={form[key] || ''}
                    onChange={set(key)}
                    autoComplete={
                      key === 'email'
                        ? 'email'
                        : key === 'phone'
                          ? 'tel'
                          : 'off'
                    }
                  />
                </div>
              ))}

            {/* Login email */}
            {mode === 'login' && (
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />

                <input
                  className={inp}
                  placeholder="Email Address"
                  type="email"
                  required
                  value={form.email || ''}
                  onChange={set('email')}
                  autoComplete="email"
                />
              </div>
            )}

            {/* Password */}
            <div>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />

                <input
                  className={inp}
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  required
                  value={form.password || ''}
                  onChange={set('password')}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password strength */}
              {mode === 'register' && form.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          passwordLength >= bar * 2
                            ? 'bg-slate-700'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-slate-400 mt-1">
                    {passwordStrong
                      ? 'Good password strength'
                      : 'Use at least 8 characters for a stronger password'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            {mode === 'register' && (
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />

                <input
                  className={`${inp} ${
                    form.confirmPassword &&
                    form.password !== form.confirmPassword
                      ? 'border-red-300 focus:ring-red-200'
                      : ''
                  }`}
                  placeholder="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  minLength={6}
                  required
                  value={form.confirmPassword || ''}
                  onChange={set('confirmPassword')}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((v) => !v)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            )}

            {/* Password mismatch */}
            {mode === 'register' &&
              form.confirmPassword &&
              form.password !== form.confirmPassword && (
                <p className="text-xs text-red-600">
                  Passwords do not match.
                </p>
              )}

            {/* Submit */}
            <button
              disabled={busy}
              className="group w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Please wait...
                </>
              ) : (
                <>
                  {mode === 'login'
                    ? 'Login to Portal'
                    : 'Create Student Account'}

                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          {/* Bottom links/info */}
          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <>
                <p className="text-sm text-slate-500">
                  Don't have an account?
                </p>

                <button
                  type="button"
                  onClick={toggle}
                  className="mt-1 text-sm font-semibold text-slate-800 hover:underline"
                >
                  Create a student account
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  Already registered?
                </p>

                <button
                  type="button"
                  onClick={toggle}
                  className="mt-1 text-sm font-semibold text-slate-800 hover:underline"
                >
                  Login to your account
                </button>
              </>
            )}
          </div>

          {mode === 'register' && (
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={14} />
              Secure student registration
            </div>
          )}

          {mode === 'login' && (
            <Link
              to="/register"
              className="hidden"
              aria-hidden="true"
              tabIndex="-1"
            >
              Create account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
