
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  RefreshCw,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';
import api, { msg } from '../api';
import { useAuth } from '../context/AuthContext';

function DashboardToast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;

    const timeout = setTimeout(() => onDismiss(toast.id), 4000);
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
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [tests, setTests] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const nextToastId = useRef(0);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ id: nextToastId.current++, message, type });
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToast((current) => current?.id === toastId ? null : current);
  }, []);

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErr('');

    try {
      const response = await api.get('/exam/tests');
      setTests(response.data || []);
    } catch (error) {
      const message = msg(error);
      setErr(message);
      showToast(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.domainId]);

  const availableCount = tests.filter((t) => t.status === 'new').length;
  const inProgressCount = tests.filter(
    (t) => t.status === 'in-progress'
  ).length;
  const submittedCount = tests.filter(
    (t) =>
      t.status === 'submitted' ||
      t.status === 'auto-submitted'
  ).length;

  const getStatus = (status) => {
    switch (status) {
      case 'new':
        return {
          label: 'Available',
          className:
            'bg-emerald-50 text-emerald-700 border-emerald-100',
          icon: PlayCircle,
        };

      case 'in-progress':
        return {
          label: 'In Progress',
          className:
            'bg-amber-50 text-amber-700 border-amber-100',
          icon: Clock3,
        };

      case 'submitted':
      case 'auto-submitted':
        return {
          label: 'Submitted',
          className:
            'bg-slate-100 text-slate-600 border-slate-200',
          icon: CheckCircle2,
        };

      default:
        return {
          label: 'Unavailable',
          className:
            'bg-slate-100 text-slate-500 border-slate-200',
          icon: ClipboardCheck,
        };
    }
  };

  const getInitials = (name = '') => {
    const parts = name.trim().split(/\s+/);

    if (!parts.length) return 'S';

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      showToast(msg(error));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardToast toast={toast} onDismiss={dismissToast} />

      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-slate-200/50 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-slate-200/40 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <header className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-sm">
                {getInitials(user?.name)}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <LayoutDashboard
                    size={17}
                    className="text-slate-500"
                  />

                  <p className="text-xs font-medium text-slate-500">
                    Student Dashboard
                  </p>
                </div>

                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Welcome, {user?.name || 'Student'}
                </h1>

                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Ready for your next assessment?
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="group flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all text-sm font-medium"
            >
              <LogOut
                size={17}
                className="group-hover:translate-x-0.5 transition-transform"
              />
              Logout
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden bg-slate-800 rounded-3xl text-white p-6 sm:p-8 mb-6 shadow-xl">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-white/5 rounded-full" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-medium mb-4">
              
                Assessment Portal
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold">
                Continue your learning journey.
              </h2>

              <p className="text-slate-300 text-sm sm:text-base mt-2 max-w-xl">
                Complete the assessments released for your selected domain
                and demonstrate your technical skills.
              </p>

              <div className="flex items-center gap-2 mt-5 text-sm text-slate-300">
                <BookOpen size={17} />
                Domain:
                <span className="font-semibold text-white">
                  {user?.domainName || 'Not selected'}
                </span>
              </div>
            </div>

            <div className="hidden sm:flex w-24 h-24 rounded-3xl bg-white/10 border border-white/10 items-center justify-center shrink-0">
              <ClipboardCheck size={45} strokeWidth={1.5} />
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={PlayCircle}
            label="Available Tests"
            value={availableCount}
            description="Ready to start"
          />

          <StatCard
            icon={Clock3}
            label="In Progress"
            value={inProgressCount}
            description="Continue where you left"
          />

          <StatCard
            icon={CheckCircle2}
            label="Submitted"
            value={submittedCount}
            description="Successfully completed"
          />
        </section>

        {/* Tests section */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Section header */}
          <div className="p-5 sm:p-6 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <ClipboardCheck
                      size={19}
                      className="text-slate-700"
                    />
                  </div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Available Tests
                  </h2>
                </div>

                <p className="text-xs sm:text-sm text-slate-500 mt-2">
                  Only released tests for your selected domain are shown.
                </p>
              </div>

              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="self-start sm:self-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin' : ''}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error */}
          {err && (
            <div className="m-5 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              <div className="flex items-start justify-between gap-3">
                <span>{err}</span>

                <button
                  onClick={() => load()}
                  className="font-semibold underline shrink-0"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="p-5 sm:p-6 space-y-4">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="border border-slate-100 rounded-2xl p-5 animate-pulse"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-4 w-full">
                      <div className="w-11 h-11 rounded-xl bg-slate-100" />

                      <div className="flex-1">
                        <div className="h-4 bg-slate-100 rounded w-1/2" />
                        <div className="h-3 bg-slate-100 rounded w-3/4 mt-3" />
                        <div className="h-3 bg-slate-100 rounded w-1/3 mt-2" />
                      </div>
                    </div>

                    <div className="h-10 w-28 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : tests.length ? (
            <div className="p-5 sm:p-6 space-y-4">
              {tests.map((test) => {
                const status = getStatus(test.status);
                const StatusIcon = status.icon;

                return (
                  <div
                    key={test._id}
                    className="group border border-slate-200 rounded-2xl p-4 sm:p-5 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      {/* Test info */}
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-800 group-hover:text-white transition-colors">
                          <FileQuestion size={21} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {test.title}
                            </h3>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-semibold ${status.className}`}
                            >
                              <StatusIcon size={12} />
                              {status.label}
                            </span>
                          </div>

                          {test.description && (
                            <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">
                              {test.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 size={14} />
                              {test.durationMinutes} minutes
                            </span>

                            <span className="inline-flex items-center gap-1.5">
                              <FileQuestion size={14} />
                              {test.questionCount} questions
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="shrink-0 w-full lg:w-auto">
                        {test.status === 'new' && (
                          <Link
                            to={`/exam/${test._id}`}
                            className="group/btn w-full lg:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
                          >
                            Start Test
                            <ArrowRight
                              size={17}
                              className="group-hover/btn:translate-x-1 transition-transform"
                            />
                          </Link>
                        )}

                        {test.status === 'in-progress' && (
                          <Link
                            to={`/exam/${test._id}`}
                            className="group/btn w-full lg:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all"
                          >
                            Resume Test
                            <ArrowRight
                              size={17}
                              className="group-hover/btn:translate-x-1 transition-transform"
                            />
                          </Link>
                        )}

                        {(test.status === 'submitted' ||
                          test.status === 'auto-submitted') && (
                          <div className="w-full lg:w-auto px-5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-semibold flex items-center justify-center gap-2">
                            <CheckCircle2 size={17} />
                            Submitted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 sm:p-14 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <ClipboardCheck
                  size={29}
                  className="text-slate-400"
                />
              </div>

              <h3 className="mt-5 font-bold text-slate-800">
                No tests available yet
              </h3>

              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                No tests are currently available for your selected domain.
                Please check again later.
              </p>

              <button
                onClick={() => load(true)}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition"
              >
                <RefreshCw size={16} />
                Check Again
              </button>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="text-center py-6">
          <p className="text-xs text-slate-400">
            VProTech Assessment Portal
          </p>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   STAT CARD
------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}) {
  return (
    <div className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="text-3xl font-bold text-slate-900 mt-1">
            {value}
          </p>

          <p className="text-xs text-slate-400 mt-1">
            {description}
          </p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}
