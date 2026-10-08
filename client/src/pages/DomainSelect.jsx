
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  Globe2,
  Layers3,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  RefreshCw,
} from 'lucide-react';
import api, { msg } from '../api';
import { useAuth } from '../context/AuthContext';

function DomainToast({ toast, onDismiss }) {
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

export default function DomainSelect() {
  const { user, selectDomain, logout } = useAuth();
  const nav = useNavigate();

  const [domains, setDomains] = useState([]);
  const [selected, setSelected] = useState(user?.domainId || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const nextToastId = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: nextToastId.current++, message, type });
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToast((current) => current?.id === toastId ? null : current);
  }, []);

  // --------------------------------------------
  // Load domains
  // --------------------------------------------
  const loadDomains = async () => {
    setLoading(true);
    setErr('');

    try {
      const response = await api.get('/auth/domains');
      setDomains(response.data || []);
    } catch (e) {
      setErr(msg(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  // --------------------------------------------
  // Filter domains
  // --------------------------------------------
  const filteredDomains = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return domains;

    return domains.filter((domain) => {
      const name = domain.name?.toLowerCase() || '';
      const description = domain.description?.toLowerCase() || '';

      return (
        name.includes(query) ||
        description.includes(query)
      );
    });
  }, [domains, search]);

  // --------------------------------------------
  // Domain icon
  // --------------------------------------------
  const getDomainIcon = (name = '') => {
    const value = name.toLowerCase();

    if (
      value.includes('mern') ||
      value.includes('web') ||
      value.includes('full stack') ||
      value.includes('development')
    ) {
      return Code2;
    }

    if (
      value.includes('database') ||
      value.includes('data') ||
      value.includes('analytics')
    ) {
      return Database;
    }

    if (
      value.includes('security') ||
      value.includes('cyber')
    ) {
      return ShieldCheck;
    }

    if (
      value.includes('design') ||
      value.includes('ui') ||
      value.includes('ux')
    ) {
      return Layers3;
    }

    if (
      value.includes('digital') ||
      value.includes('marketing')
    ) {
      return Globe2;
    }

    return Sparkles;
  };

  // --------------------------------------------
  // Select domain
  // --------------------------------------------
  const handleSelect = (id) => {
    setSelected(id);
    setErr('');
    const domain = domains.find((item) => item._id === id);
    if (domain) showToast(`${domain.name} selected.`);
  };

  // --------------------------------------------
  // Submit domain
  // --------------------------------------------
  const submit = async () => {
    if (!selected) {
      showToast('Please select a domain to continue.', 'error');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      await selectDomain(selected);
      nav('/', { replace: true });
    } catch (e) {
      showToast(msg(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------
  // Logout
  // --------------------------------------------
  const handleLogout = async () => {
    if (busy) return;

    try {
      await logout();
    } catch (e) {
      // Preserve existing logout behavior even if
      // the logout request reports an error.
      showToast(msg(e), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-stone-100 to-slate-200 px-4 py-6 sm:px-6 lg:px-8 relative overflow-hidden">
      <DomainToast toast={toast} onDismiss={dismissToast} />

      {/* Background decoration */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-slate-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-slate-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative min-h-[calc(100vh-3rem)] grid place-items-center">

        <div className="w-full max-w-4xl">

          {/* Header */}
          <div className="text-center mb-7">

          
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Assessment Portal
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Choose Your Domain
            </h1>

            <p className="text-sm sm:text-base text-slate-500 mt-2 max-w-xl mx-auto">
              Select the domain you want to take assessments for.
              Your dashboard will only show tests released for your selected domain.
            </p>

            {user?.name && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-sm text-slate-600">
                <span className="w-7 h-7 rounded-full bg-slate-800 text-white grid place-items-center text-xs font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </span>

                <span>
                  Welcome, <strong className="text-slate-800">{user.name}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-white overflow-hidden">

            {/* Top progress/header */}
            <div className="px-5 py-5 sm:px-8 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center">
                      <CheckCircle2 size={18} className="text-slate-700" />
                    </div>

                    <h2 className="font-bold text-slate-900">
                      Available Domains
                    </h2>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 ml-10">
                    {domains.length > 0
                      ? `${domains.length} domain${domains.length !== 1 ? 's' : ''} available`
                      : 'Choose a domain to continue'}
                  </p>
                </div>

                {/* Search */}
                {!loading && domains.length > 0 && (
                  <div className="relative w-full sm:w-64">

                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search domains..."
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-8">

              {/* Loading state */}
              {loading && (
                <div className="grid sm:grid-cols-2 gap-4">

                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="border border-slate-200 rounded-2xl p-5 animate-pulse"
                    >
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-200" />

                        <div className="flex-1">
                          <div className="h-4 bg-slate-200 rounded w-2/3" />
                          <div className="h-3 bg-slate-200 rounded w-full mt-3" />
                          <div className="h-3 bg-slate-200 rounded w-4/5 mt-2" />
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              )}

              {/* Error */}
              {!loading && err && domains.length === 0 && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">

                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto mb-3">
                    <X size={22} />
                  </div>

                  <h3 className="font-semibold text-red-900">
                    Unable to load domains
                  </h3>

                  <p className="text-sm text-red-700 mt-1">
                    {err}
                  </p>

                  <button
                    type="button"
                    onClick={loadDomains}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition"
                  >
                    <RefreshCw size={16} />
                    Try Again
                  </button>

                </div>
              )}

              {/* Domain cards */}
              {!loading && filteredDomains.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4">

                  {filteredDomains.map((domain) => {
                    const Icon = getDomainIcon(domain.name);
                    const isSelected = selected === domain._id;

                    return (
                      <button
                        type="button"
                        key={domain._id}
                        onClick={() => handleSelect(domain._id)}
                        className={`
                          group relative text-left rounded-2xl border p-5
                          transition-all duration-200
                          ${
                            isSelected
                              ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-200 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-md hover:-translate-y-0.5'
                          }
                        `}
                      >

                        {/* Selected check */}
                        <div
                          className={`
                            absolute top-4 right-4 w-7 h-7 rounded-full
                            grid place-items-center transition-all
                            ${
                              isSelected
                                ? 'bg-slate-800 text-white scale-100'
                                : 'bg-slate-100 text-transparent scale-90 group-hover:scale-100'
                            }
                          `}
                        >
                          <Check size={15} strokeWidth={3} />
                        </div>

                        <div className="flex items-start gap-4 pr-7">

                          {/* Icon */}
                          <div
                            className={`
                              flex-shrink-0 w-12 h-12 rounded-xl
                              grid place-items-center transition-all
                              ${
                                isSelected
                                  ? 'bg-slate-800 text-white'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                              }
                            `}
                          >
                            <Icon size={23} />
                          </div>

                          <div className="min-w-0">

                            <h3
                              className={`
                                font-bold text-base transition
                                ${
                                  isSelected
                                    ? 'text-slate-900'
                                    : 'text-slate-800'
                                }
                              `}
                            >
                              {domain.name}
                            </h3>

                            {domain.description ? (
                              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                                {domain.description}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-400 mt-1.5">
                                Assessment domain
                              </p>
                            )}

                          </div>
                        </div>

                        {/* Bottom selection indicator */}
                        <div
                          className={`
                            mt-4 flex items-center gap-1 text-xs font-semibold
                            transition-all
                            ${
                              isSelected
                                ? 'text-slate-800 opacity-100'
                                : 'text-slate-400 opacity-0 group-hover:opacity-100'
                            }
                          `}
                        >
                          {isSelected ? 'Selected' : 'Select this domain'}
                          <ChevronRight size={14} />
                        </div>

                      </button>
                    );
                  })}

                </div>
              )}

              {/* No search results */}
              {!loading &&
                domains.length > 0 &&
                filteredDomains.length === 0 && (
                  <div className="text-center py-12">

                    <div className="w-14 h-14 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4">
                      <Search size={24} className="text-slate-400" />
                    </div>

                    <h3 className="font-semibold text-slate-800">
                      No domains found
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      Try searching with a different keyword.
                    </p>

                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="mt-4 text-sm font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Clear search
                    </button>

                  </div>
                )}

              {/* No domains */}
              {!loading && domains.length === 0 && !err && (
                <div className="text-center py-12">

                  <div className="w-14 h-14 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4">
                    <Layers3 size={25} className="text-slate-400" />
                  </div>

                  <h3 className="font-semibold text-slate-800">
                    No domains available
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Please check again later.
                  </p>

                  <button
                    type="button"
                    onClick={loadDomains}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium transition"
                  >
                    <RefreshCw size={15} />
                    Refresh
                  </button>

                </div>
              )}

              {/* Error while domains are visible */}
              {!loading && err && domains.length > 0 && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {err}
                </div>
              )}

              {/* Selected domain preview */}
              {!loading && selected && (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-slate-800 text-white grid place-items-center">
                      <CheckCircle2 size={18} />
                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Selected Domain
                      </p>

                      <p className="font-semibold text-slate-900 truncate">
                        {domains.find((d) => d._id === selected)?.name ||
                          'Selected domain'}
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() => setSelected('')}
                      disabled={busy}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50"
                    >
                      Change
                    </button>

                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 mt-7">

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50"
                >
                  <LogOut size={17} />
                  Logout
                </button>

                <button
                  type="button"
                  disabled={busy || !selected}
                  onClick={submit}
                  className="
                    group inline-flex items-center justify-center gap-2
                    px-6 py-3 rounded-xl
                    bg-slate-800 text-white
                    font-semibold shadow-md
                    transition-all duration-200
                    hover:bg-slate-700 hover:shadow-lg
                    hover:-translate-y-0.5
                    disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0
                    disabled:hover:shadow-md
                  "
                >
                  {busy ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight
                        size={18}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </>
                  )}
                </button>

              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-4 sm:px-8 bg-slate-50/70">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">

                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} />
                  Your assessment access is based on your selected domain.
                </div>

                <span>
                  Step 1 of 1
                </span>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
