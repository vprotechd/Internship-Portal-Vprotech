
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Download,
  Pencil,
  Trash2,
  Check,
  Ban,
  LayoutDashboard,
  Users,
  Layers3,
  HelpCircle,
  ClipboardList,
  FileCheck2,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  UserRound,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api, { msg } from '../api';
import { useAuth } from '../context/AuthContext';

const inp =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

const btn =
  'px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-slate-800';

const card = 'bg-white rounded-xl shadow-sm border border-slate-100 p-4';

const ToastContext = createContext(() => {});

const useToast = () => useContext(ToastContext);

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timeout);
  }, [onDismiss, toast.id]);

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-4 shadow-lg ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : isInfo
            ? 'border-sky-200 bg-sky-50 text-sky-800'
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

const useList = (path) => {
  const [items, setItems] = useState([]);

  const load = useCallback(
    () =>
      api
        .get(path)
        .then((r) => setItems(r.data))
        .catch(() => {}),
    [path]
  );

  useEffect(() => {
    load();
  }, [load]);

  return [items, load];
};

/* =========================================================
   DASHBOARD
========================================================= */

function DashboardTab() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const loadDashboard = useCallback(async () => {
    try {
      setErr('');
      const r = await api.get('/admin/dashboard');
      setData(r.data);
    } catch (e) {
      setErr(msg(e));
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (err) {
    return (
      <div className={`${card} flex flex-col items-center justify-center py-12`}>
        <p className="text-red-700 text-sm mb-4">{err}</p>

        <button className={btn} onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse"
          >
            <div className="h-3 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    ['Total Students', data.totalStudents],
    ['Domains', data.totalDomains],
    ['Tests', data.totalTests],
    ['Active Tests', data.activeTests],
    ['Released Tests', data.releasedTests],
    ['Total Attempts', data.totalAttempts],
    ['Completed', data.completedAttempts],
    ['Pending Reviews', data.pendingReviews],
    ['Passed', data.passed],
    ['Failed', data.failed],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Dashboard Overview
          </h2>
          <p className="text-sm text-slate-500">
            Monitor your assessment portal activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-medium hover:bg-slate-50 transition"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(([k, v]) => (
          <div
            className={`${card} hover:shadow-md transition`}
            key={k}
          >
            <p className="text-xs text-slate-500">{k}</p>
            <p className="text-2xl font-bold mt-1 text-slate-800">
              {v ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">
              Students by Domain
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Current student distribution.
            </p>
          </div>

          <Users size={20} className="text-slate-400" />
        </div>

        <div className="space-y-2">
          {(data.domainCounts || []).map((d) => (
            <div
              key={d.domainId}
              className="flex justify-between items-center text-sm border-b last:border-0 py-3 hover:bg-slate-50 px-2 rounded transition"
            >
              <span className="text-slate-700">{d.name}</span>

              <span className="font-semibold bg-slate-100 px-2 py-1 rounded-md">
                {d.students}
              </span>
            </div>
          ))}

          {!data.domainCounts?.length && (
            <p className="text-sm text-slate-500 py-4">
              No domain assignments yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DOMAINS
========================================================= */

function DomainsTab() {
  const [domains, load] = useList('/admin/domains');
  const toast = useToast();

  const [f, setF] = useState({
    name: '',
    description: '',
  });

  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const saveDomain = async (e) => {
    e.preventDefault();

    setErr('');
    setSaving(true);

    try {
      if (edit) {
        await api.put(`/admin/domains/${edit}`, f);
      } else {
        await api.post('/admin/domains', f);
      }

      setF({
        name: '',
        description: '',
      });

      setEdit(null);
      load();
      toast(`Domain ${edit ? 'updated' : 'created'} successfully.`);
    } catch (e) {
      setErr(msg(e));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (d) => {
    try {
      await api.put(`/admin/domains/${d._id}`, {
        isActive: !d.isActive,
      });

      load();
      toast(`Domain ${d.isActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (e) {
      setErr(msg(e));
    }
  };

  const del = async (d) => {
    if (!confirm('Delete this unused domain?')) return;

    try {
      await api.delete(`/admin/domains/${d._id}`);
      load();
      toast('Domain deleted successfully.');
    } catch (e) {
      setErr(msg(e));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form
        onSubmit={saveDomain}
        className={`${card} space-y-3`}
      >
        <div>
          <h2 className="font-semibold text-slate-800">
            {edit ? 'Edit Domain' : 'Add Domain'}
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            Create domains used by students and assessments.
          </p>
        </div>

        <input
          className={inp}
          placeholder="Domain name"
          required
          value={f.name}
          onChange={(e) =>
            setF({
              ...f,
              name: e.target.value,
            })
          }
        />

        <textarea
          className={inp}
          placeholder="Description"
          rows={4}
          value={f.description}
          onChange={(e) =>
            setF({
              ...f,
              description: e.target.value,
            })
          }
        />

        {err && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-lg p-3">
            {err}
          </p>
        )}

        <div className="flex gap-2">
          <button
            className={btn}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : edit
                ? 'Update Domain'
                : 'Create Domain'}
          </button>

          {edit && (
            <button
              type="button"
              className="px-3 py-2 border rounded-lg text-sm hover:bg-slate-50"
              onClick={() => {
                setEdit(null);
                setF({
                  name: '',
                  description: '',
                });
                setErr('');
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {domains.map((d) => (
          <div
            key={d._id}
            className={`${card} flex justify-between gap-3 hover:shadow-md transition`}
          >
            <div>
              <b className="text-slate-800">{d.name}</b>

              <p className="text-xs text-slate-500 mt-1">
                {d.description || 'No description'}
              </p>

              <p className="text-xs mt-2">
                {d.studentCount || 0} students ·{' '}
                <span
                  className={
                    d.isActive
                      ? 'text-emerald-700'
                      : 'text-slate-500'
                  }
                >
                  {d.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                title="Edit"
                className="p-2 rounded-lg hover:bg-slate-100"
                onClick={() => {
                  setEdit(d._id);
                  setF({
                    name: d.name,
                    description: d.description || '',
                  });
                }}
              >
                <Pencil size={16} />
              </button>

              <button
                title={d.isActive ? 'Deactivate' : 'Activate'}
                className="p-2 rounded-lg hover:bg-slate-100"
                onClick={() => toggle(d)}
              >
                {d.isActive ? (
                  <Ban size={16} />
                ) : (
                  <Check size={16} />
                )}
              </button>

              <button
                title="Delete"
                className="p-2 rounded-lg hover:bg-red-50"
                onClick={() => del(d)}
              >
                <Trash2
                  size={16}
                  className="text-red-800"
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   QUESTIONS
========================================================= */

const blankQ = {
  questionText: '',
  questionType: 'mcq',
  options: ['', '', '', ''],
  correctOption: 0,
  difficulty: 'easy',
  marks: 1,
  instructions: '',
};

function QuestionsTab() {
  const [qs, load] = useList('/admin/questions');
  const toast = useToast();

  const [f, setF] = useState(blankQ);
  const [id, setId] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setErr('');
    setSaving(true);

    try {
      if (id) {
        await api.put(`/admin/questions/${id}`, f);
      } else {
        await api.post('/admin/questions', f);
      }

      setF(blankQ);
      setId(null);
      load();
      toast(`Question ${id ? 'updated' : 'added'} successfully.`);
    } catch (x) {
      setErr(msg(x));
    } finally {
      setSaving(false);
    }
  };

  const del = async (q) => {
    if (!confirm('Delete question?')) return;

    try {
      await api.delete(`/admin/questions/${q._id}`);
      load();
      toast('Question deleted successfully.');
    } catch (e) {
      setErr(msg(e));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form
        onSubmit={submit}
        className={`${card} space-y-2`}
      >
        <h2 className="font-semibold">
          {id ? 'Edit' : 'Add'} Question
        </h2>

        <textarea
          className={inp}
          placeholder="Question text"
          required
          rows={4}
          value={f.questionText}
          onChange={(e) =>
            setF({
              ...f,
              questionText: e.target.value,
            })
          }
        />

        <div className="grid sm:grid-cols-3 gap-2">
          <select
            className={inp}
            value={f.questionType}
            onChange={(e) =>
              setF({
                ...f,
                questionType: e.target.value,
              })
            }
          >
            <option value="mcq">MCQ</option>
            <option value="coding">Coding</option>
          </select>

          <select
            className={inp}
            value={f.difficulty}
            onChange={(e) =>
              setF({
                ...f,
                difficulty: e.target.value,
              })
            }
          >
            <option>easy</option>
            <option>medium</option>
            <option>hard</option>
          </select>

          <input
            className={inp}
            type="number"
            min="0"
            step="0.5"
            value={f.marks}
            onChange={(e) =>
              setF({
                ...f,
                marks: Number(e.target.value),
              })
            }
          />
        </div>

        {f.questionType === 'coding' && (
          <textarea
            className={inp}
            placeholder="Coding instructions (optional)"
            rows={5}
            value={f.instructions}
            onChange={(e) =>
              setF({
                ...f,
                instructions: e.target.value,
              })
            }
          />
        )}

        {f.questionType === 'mcq' &&
          f.options.map((o, i) => (
            <div
              key={i}
              className="flex gap-2 items-center"
            >
              <input
                type="radio"
                checked={Number(f.correctOption) === i}
                onChange={() =>
                  setF({
                    ...f,
                    correctOption: i,
                  })
                }
              />

              <input
                className={inp}
                required
                placeholder={`Option ${i + 1}`}
                value={o}
                onChange={(e) =>
                  setF({
                    ...f,
                    options: f.options.map((x, j) =>
                      j === i ? e.target.value : x
                    ),
                  })
                }
              />
            </div>
          ))}

        {err && (
          <p className="text-sm text-red-800 bg-red-50 p-3 rounded-lg">
            {err}
          </p>
        )}

        <button
          className={btn}
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : id
              ? 'Update Question'
              : 'Add Question'}
        </button>
      </form>

      <div className="space-y-2">
        {qs.map((q) => (
          <div
            key={q._id}
            className={`${card} flex justify-between gap-2 text-sm hover:shadow-md transition`}
          >
            <span>
              {q.questionText}

              <em className="text-slate-400">
                {' '}
                · {q.questionType} · {q.marks} mark
              </em>
            </span>

            <span className="flex gap-2 shrink-0">
              <button
                className="p-2 rounded-lg hover:bg-slate-100"
                onClick={() => {
                  setF({
                    ...blankQ,
                    ...q,
                    options: q.options?.length
                      ? q.options
                      : blankQ.options,
                  });

                  setId(q._id);
                }}
              >
                <Pencil size={16} />
              </button>

              <button
                className="p-2 rounded-lg hover:bg-red-50"
                onClick={() => del(q)}
              >
                <Trash2
                  size={16}
                  className="text-red-800"
                />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   TESTS
========================================================= */

const blankT = {
  title: '',
  description: '',
  domainId: '',
  durationMinutes: 30,
  passingMarks: 0,
  isActive: true,
  questions: [],
};

function TestsTab() {
  const [tests, load] = useList('/admin/tests');
  const [qs] = useList('/admin/questions');
  const [domains] = useList('/admin/domains');
  const toast = useToast();

  const [f, setF] = useState(blankT);
  const [id, setId] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    setErr('');
    setSaving(true);

    try {
      if (id) {
        await api.put(`/admin/tests/${id}`, f);
      } else {
        await api.post('/admin/tests', f);
      }

      setF(blankT);
      setId(null);
      load();
      toast(`Test ${id ? 'updated' : 'created'} successfully.`);
    } catch (x) {
      setErr(msg(x));
    } finally {
      setSaving(false);
    }
  };

  const toggleQ = (qid) =>
    setF((v) => ({
      ...v,
      questions: v.questions.includes(qid)
        ? v.questions.filter((x) => x !== qid)
        : [...v.questions, qid],
    }));

  const del = async (t) => {
    if (
      !confirm(
        'Delete test? Existing submitted tests cannot be deleted.'
      )
    ) {
      return;
    }

    try {
      await api.delete(`/admin/tests/${t._id}`);
      load();
      toast('Test deleted successfully.');
    } catch (e) {
      setErr(msg(e));
    }
  };

  const release = async (t) => {
    try {
      await api.post(
        `/admin/tests/${t._id}/${t.isReleased ? 'stop' : 'release'}`
      );

      load();
      toast(t.isReleased ? 'Test stopped.' : 'Test released.');
    } catch (e) {
      setErr(msg(e));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form
        onSubmit={submit}
        className={`${card} space-y-2`}
      >
        <h2 className="font-semibold">
          {id ? 'Edit' : 'Create'} Test
        </h2>

        <input
          className={inp}
          required
          placeholder="Test title"
          value={f.title}
          onChange={(e) =>
            setF({
              ...f,
              title: e.target.value,
            })
          }
        />

        <textarea
          className={inp}
          placeholder="Description / instructions"
          value={f.description}
          onChange={(e) =>
            setF({
              ...f,
              description: e.target.value,
            })
          }
        />

        <select
          className={inp}
          required
          value={f.domainId}
          onChange={(e) =>
            setF({
              ...f,
              domainId: e.target.value,
            })
          }
        >
          <option value="">Select domain</option>

          {domains
            .filter((d) => d.isActive)
            .map((d) => (
              <option
                key={d._id}
                value={d._id}
              >
                {d.name}
              </option>
            ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            Duration (minutes)
            <input
              className={inp}
              type="number"
              min="1"
              max="1440"
              value={f.durationMinutes}
              onChange={(e) =>
                setF({
                  ...f,
                  durationMinutes: Number(e.target.value),
                })
              }
            />
          </label>

          <label className="space-y-1 text-xs font-medium text-slate-600">
            Passing marks
            <input
              className={inp}
              type="number"
              min="0"
              value={f.passingMarks}
              onChange={(e) =>
                setF({
                  ...f,
                  passingMarks: Number(e.target.value),
                })
              }
            />
          </label>
        </div>

        <label className="flex gap-2 text-sm items-center">
          <input
            type="checkbox"
            checked={f.isActive}
            onChange={(e) =>
              setF({
                ...f,
                isActive: e.target.checked,
              })
            }
          />

          Active
        </label>

        <div className="max-h-56 overflow-auto border rounded-lg p-2 space-y-1">
          {qs.map((q) => (
            <label
              key={q._id}
              className="flex gap-2 text-sm hover:bg-slate-50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={f.questions.includes(q._id)}
                onChange={() => toggleQ(q._id)}
              />

              <span>
                {q.questionText}{' '}
                <small className="text-slate-400">
                  ({q.marks}m)
                </small>
              </span>
            </label>
          ))}
        </div>

        {err && (
          <p className="text-sm text-red-800 bg-red-50 p-3 rounded-lg">
            {err}
          </p>
        )}

        <button
          className={btn}
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : id
              ? 'Update Test'
              : 'Create Test'}
        </button>
      </form>

      <div className="space-y-2">
        {tests.map((t) => (
          <div
            key={t._id}
            className={`${card} space-y-3 hover:shadow-md transition`}
          >
            <div className="flex justify-between gap-3">
              <div>
                <b>{t.title}</b>

                <p className="text-xs text-slate-500">
                  {t.domainId?.name} · {t.durationMinutes}m ·{' '}
                  {t.questions?.length || 0} questions · pass{' '}
                  {t.passingMarks}
                </p>
              </div>

              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  t.isReleased
                    ? 'bg-emerald-50 text-emerald-700'
                    : t.isActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.isReleased
                  ? 'Available'
                  : t.isActive
                    ? 'Draft'
                    : 'Inactive'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={btn}
                onClick={() => {
                  setF({
                    ...blankT,
                    ...t,
                    domainId: t.domainId?._id || '',
                    questions:
                      t.questions?.map((q) => q._id || q) || [],
                  });

                  setId(t._id);
                }}
              >
                <Pencil
                  size={14}
                  className="inline mr-1"
                />
                Edit
              </button>

              <button
                className="px-3 py-2 rounded-lg text-sm border hover:bg-slate-50"
                onClick={() => release(t)}
              >
                {t.isReleased ? 'Stop Test' : 'Allow Test'}
              </button>

              <button
                className="px-3 py-2 rounded-lg text-sm border hover:bg-red-50"
                onClick={() => del(t)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   REVIEW
========================================================= */

function ReviewPanel({
  id,
  onClose,
  onSaved,
}) {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [marks, setMarks] = useState(0);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/admin/results/${id}`)
      .then((r) => {
        setS(r.data);
        setMarks(r.data.manualScore || 0);
      })
      .catch((e) => setErr(msg(e)));
  }, [id]);

  if (!s) {
    return (
      <div className="fixed inset-0 bg-black/40 grid place-items-center z-30 p-4">
        <div className="bg-white p-5 rounded-xl">
          {err || 'Loading…'}
        </div>
      </div>
    );
  }

  const ans = s.answers || {};

  const grade = async () => {
    setSaving(true);

    try {
      await api.put(`/admin/results/${id}/grade`, {
        manualScore: marks,
      });

      onSaved();
      toast('Review saved successfully.');
      onClose();
    } catch (e) {
      setErr(msg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-30">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-auto p-5 space-y-3">
        <div className="flex justify-between items-center">
          <b>
            {s.studentId?.name} — {s.testId?.title}
          </b>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-500">
          MCQ score: {s.score} · Current coding marks:{' '}
          {s.manualScore || 0} · Violations:{' '}
          {s.tabSwitchCount}
        </p>

        {s.testId?.questions.map((q, i) => (
          <div
            key={q._id}
            className="border rounded-lg p-3 text-sm"
          >
            <p className="font-medium">
              {i + 1}. {q.questionText} ({q.marks} marks)
            </p>

            {q.questionType === 'mcq' ? (
              <p className="mt-1">
                Student:{' '}
                {q.options?.[ans[q._id]] ?? '—'} · Correct:{' '}
                {q.options?.[q.correctOption] ?? '—'}
              </p>
            ) : (
              <pre className="bg-stone-100 p-2 mt-1 rounded overflow-auto whitespace-pre-wrap text-xs">
                {ans[q._id] || '(no answer)'}
              </pre>
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">
            Coding marks:
          </span>

          <input
            className={`${inp} w-28`}
            type="number"
            min="0"
            value={marks}
            onChange={(e) =>
              setMarks(Number(e.target.value))
            }
          />

          <button
            className={btn}
            disabled={saving}
            onClick={grade}
          >
            {saving ? 'Saving...' : 'Save Review'}
          </button>
        </div>

        {err && (
          <p className="text-sm text-red-800 bg-red-50 p-3 rounded-lg">
            {err}
          </p>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   RESULTS
========================================================= */

function ResultsTab() {
  const [tests] = useList('/admin/tests');

  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState({
    rows: [],
    pages: 1,
    stats: {},
  });

  const [review, setReview] = useState(null);

  const load = useCallback(
    () =>
      api
        .get('/admin/results', {
          params: {
            testId: filter || undefined,
            q: q || undefined,
            page,
          },
        })
        .then((r) => setData(r.data))
        .catch(() => {}),
    [filter, q, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  const exportUrl = `/api/admin/results/export.csv${
    filter ? `?testId=${filter}` : ''
  }`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className={`${inp} max-w-xs`}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All tests</option>

          {tests.map((t) => (
            <option
              key={t._id}
              value={t._id}
            >
              {t.title}
            </option>
          ))}
        </select>

        <input
          className={`${inp} max-w-xs`}
          placeholder="Search student"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        <a
          className={`${btn} flex items-center gap-1`}
          href={exportUrl}
        >
          <Download size={14} />
          Export CSV
        </a>
      </div>

      <div className="text-sm text-slate-600">
        Attempts: {data.total || 0} · Completed:{' '}
        {data.completed || 0} · Passed:{' '}
        {data.stats?.passed || 0} · Failed:{' '}
        {data.stats?.failed || 0}
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-sm text-left min-w-[900px]">
          <thead>
            <tr className="text-slate-500">
              {[
                'Student',
                'Domain',
                'Test',
                'Score',
                'Pass Mark',
                'Pass/Fail',
                'Status',
                'Violations',
                'Submitted',
                '',
              ].map((h) => (
                <th
                  key={h}
                  className="pr-4 pb-2"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.rows.map((r) => {
              const total =
                (r.score || 0) +
                (r.manualScore || 0);

              const pass =
                total >= (r.passingMarks || 0);

              return (
                <tr
                  key={r._id}
                  className="border-t hover:bg-slate-50 transition"
                >
                  <td className="pr-4 py-2">
                    {r.student?.name}

                    <br />

                    <span className="text-xs text-slate-400">
                      {r.student?.email}
                    </span>
                  </td>

                  <td className="pr-4">
                    {r.domain?.name || '—'}
                  </td>

                  <td className="pr-4">
                    {r.test?.title}
                  </td>

                  <td className="pr-4 font-medium">
                    {total}
                  </td>

                  <td className="pr-4">
                    {r.passingMarks}
                  </td>

                  <td
                    className={`pr-4 font-medium ${
                      pass
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                  >
                    {pass ? 'Pass' : 'Fail'}
                  </td>

                  <td className="pr-4">
                    {r.status}
                  </td>

                  <td className="pr-4">
                    {r.tabSwitchCount}
                  </td>

                  <td className="pr-4">
                    {r.submittedAt
                      ? new Date(
                          r.submittedAt
                        ).toLocaleString()
                      : '—'}
                  </td>

                  <td>
                    {r.status !== 'in-progress' && (
                      <button
                        className="underline"
                        onClick={() =>
                          setReview(r._id)
                        }
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!data.rows.length && (
          <div className="py-10 text-center text-sm text-slate-500">
            No results found.
          </div>
        )}
      </div>

      <div className="flex gap-3 items-center text-sm">
        <button
          disabled={page <= 1}
          className={btn}
          onClick={() => setPage(page - 1)}
        >
          Prev
        </button>

        <span>
          Page {page} of {data.pages}
        </span>

        <button
          disabled={page >= data.pages}
          className={btn}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      {review && (
        <ReviewPanel
          id={review}
          onClose={() => setReview(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/* =========================================================
   STUDENTS
========================================================= */

function StudentsTab() {
  const [domains] = useList('/admin/domains');
  const toast = useToast();

  const [q, setQ] = useState('');
  const [domainId, setDomainId] = useState('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState({
    rows: [],
    pages: 1,
    total: 0,
  });

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const r = await api.get('/admin/users', {
        params: {
          q: q || undefined,
          domainId: domainId || undefined,
          page,
        },
      });

      setData(
        r.data || {
          rows: [],
          pages: 1,
          total: 0,
        }
      );
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, [q, domainId, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);

    return () => clearTimeout(t);
  }, [load]);

  const reset = async (u) => {
    const password = prompt(
      `New password for ${u.email} (min 6 chars):`
    );

    if (!password) return;

    if (password.length < 6) {
      toast('Password must contain at least 6 characters.', 'error');
      return;
    }

    try {
      await api.post(
        `/admin/users/${u._id}/reset-password`,
        { password }
      );

      toast('Password updated successfully.');
    } catch (e) {
      toast(msg(e), 'error');
    }
  };

  /*
   * Escapes text before putting it inside an Excel HTML table.
   * Also protects against Excel formula injection.
   */
  const excelSafe = (value) => {
    let text = String(value ?? '');

    if (/^[=+\-@]/.test(text)) {
      text = `'${text}`;
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /*
   * Creates an Excel-compatible .xls file directly in the browser.
   * No extra npm package is required.
   *
   * It loads ALL pages matching the current filters so the export
   * is not limited to the currently visible page.
   */
  const downloadStudentsExcel = async () => {
    setExporting(true);
    setError('');

    try {
      const firstResponse = await api.get(
        '/admin/users',
        {
          params: {
            q: q || undefined,
            domainId: domainId || undefined,
            page: 1,
          },
        }
      );

      const firstData = firstResponse.data || {};

      let allStudents = [
        ...(firstData.rows || []),
      ];

      const totalPages = Math.max(
        1,
        Number(firstData.pages || 1)
      );

      for (let currentPage = 2; currentPage <= totalPages; currentPage += 1) {
        const response = await api.get(
          '/admin/users',
          {
            params: {
              q: q || undefined,
              domainId: domainId || undefined,
              page: currentPage,
            },
          }
        );

        allStudents = [
          ...allStudents,
          ...(response.data?.rows || []),
        ];
      }

      if (!allStudents.length) {
        toast('There are no students to export.', 'info');
        return;
      }

      const header = [
        'S.No.',
        'Student Name',
        'Email',
        'Phone',
        'College',
        'Domain',
        'Registered Date',
      ];

      const bodyRows = allStudents
        .map((student, index) => {
          const registeredDate = student.createdAt
            ? new Date(
                student.createdAt
              ).toLocaleString()
            : '';

          return `
            <tr>
              <td>${index + 1}</td>
              <td>${excelSafe(student.name)}</td>
              <td>${excelSafe(student.email)}</td>
              <td>${excelSafe(student.phone)}</td>
              <td>${excelSafe(student.collegeName)}</td>
              <td>${excelSafe(
                student.domainId?.name ||
                  'No domain'
              )}</td>
              <td>${excelSafe(registeredDate)}</td>
            </tr>
          `;
        })
        .join('');

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              table {
                border-collapse: collapse;
                width: 100%;
              }

              th,
              td {
                border: 1px solid #d1d5db;
                padding: 8px;
                text-align: left;
              }

              th {
                background: #e5e7eb;
                font-weight: bold;
              }
            </style>
          </head>

          <body>
            <table>
              <thead>
                <tr>
                  ${header
                    .map(
                      (item) =>
                        `<th>${excelSafe(
                          item
                        )}</th>`
                    )
                    .join('')}
                </tr>
              </thead>

              <tbody>
                ${bodyRows}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob(
        [`\ufeff${html}`],
        {
          type: 'application/vnd.ms-excel;charset=utf-8;',
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      const date = new Date()
        .toISOString()
        .slice(0, 10);

      link.href = url;
      link.download = `vprotech-students-${date}.xls`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      toast(`${allStudents.length} student records exported.`);
    } catch (e) {
      setError(
        msg(e) ||
          'Unable to download student data.'
      );
      toast(msg(e) || 'Unable to download student data.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setQ('');
    setDomainId('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Students heading */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Students
          </h2>

          <p className="text-sm text-slate-500">
            View, search, filter and manage registered
            students.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={downloadStudentsExcel}
            disabled={
              exporting ||
              loading
            }
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <FileSpreadsheet size={16} />

            {exporting
              ? 'Preparing Excel...'
              : 'Download Excel'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`${card} space-y-3`}>
        <div className="flex items-center gap-2">
          <Filter
            size={17}
            className="text-slate-500"
          />

          <h3 className="font-medium text-slate-800">
            Student Filters
          </h3>
        </div>

        <div className="grid md:grid-cols-[1fr_240px_auto] gap-2">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              className={`${inp} pl-9`}
              placeholder="Search name, email or college"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className={inp}
            value={domainId}
            onChange={(e) => {
              setDomainId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              All domains
            </option>

            {domains.map((d) => (
              <option
                key={d._id}
                value={d._id}
              >
                {d.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg border text-sm hover:bg-slate-50 transition"
          >
            Clear Filters
          </button>
        </div>

        <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-500">
          <span>
            Showing{' '}
            <strong className="text-slate-700">
              {data.rows?.length || 0}
            </strong>{' '}
            of{' '}
            <strong className="text-slate-700">
              {data.total || 0}
            </strong>{' '}
            students
          </span>

          {exporting && (
            <span className="text-emerald-700 font-medium">
              Preparing all matching student records...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Student table */}
      <div className={`${card} p-0 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600">
                  #
                </th>

                <th className="px-4 py-3 font-semibold text-slate-600">
                  Student
                </th>

                <th className="px-4 py-3 font-semibold text-slate-600">
                  Email
                </th>

                <th className="px-4 py-3 font-semibold text-slate-600">
                  Phone
                </th>

                <th className="px-4 py-3 font-semibold text-slate-600">
                  College
                </th>

                <th className="px-4 py-3 font-semibold text-slate-600">
                  Domain
                </th>

                <th className="px-4 py-3 font-semibold text-slate-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({ length: 5 }).map(
                  (_, index) => (
                    <tr
                      key={`loading-${index}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-4">
                        <div className="h-4 w-5 bg-slate-200 rounded animate-pulse" />
                      </td>

                      {Array.from({
                        length: 6,
                      }).map((__, i) => (
                        <td
                          key={i}
                          className="px-4 py-4"
                        >
                          <div className="h-4 bg-slate-200 rounded animate-pulse w-28" />
                        </td>
                      ))}
                    </tr>
                  )
                )}

              {!loading &&
                data.rows?.map((u, index) => {
                  const absoluteIndex =
                    (page - 1) *
                      Math.max(
                        1,
                        Math.ceil(
                          (data.total || 0) /
                            Math.max(
                              1,
                              data.rows?.length ||
                                1
                            )
                        )
                      );

                  return (
                    <tr
                      key={u._id}
                      className="border-b last:border-0 hover:bg-slate-50 transition"
                    >
                      <td className="px-4 py-4 text-slate-500">
                        {absoluteIndex + index + 1}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold shrink-0">
                            {String(
                              u.name || 'S'
                            )
                              .trim()
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-800">
                              {u.name ||
                                'Unnamed Student'}
                            </p>

                            <p className="text-xs text-slate-400">
                              Student
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {u.email || '—'}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {u.phone || '—'}
                      </td>

                      <td className="px-4 py-4 text-slate-600 max-w-[220px]">
                        <span
                          className="block truncate"
                          title={
                            u.collegeName || ''
                          }
                        >
                          {u.collegeName || '—'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {u.domainId?.name ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                            {u.domainId.name}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            No domain
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-medium hover:bg-slate-800 transition"
                          onClick={() =>
                            reset(u)
                          }
                        >
                          <UserRound size={14} />
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading &&
          !data.rows?.length && (
            <div className="py-14 text-center">
              <Users
                size={38}
                className="mx-auto text-slate-300 mb-3"
              />

              <h3 className="font-semibold text-slate-700">
                No students found
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                Try changing your search or domain
                filter.
              </p>
            </div>
          )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-slate-500">
          Page {page} of {data.pages || 1}
        </p>

        <div className="flex gap-2">
          <button
            disabled={
              loading ||
              page <= 1
            }
            className={btn}
            onClick={() =>
              setPage((current) =>
                Math.max(1, current - 1)
              )
            }
          >
            Previous
          </button>

          <button
            disabled={
              loading ||
              page >= (data.pages || 1)
            }
            className={btn}
            onClick={() =>
              setPage((current) =>
                Math.min(
                  data.pages || 1,
                  current + 1
                )
              )
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN PANEL
========================================================= */

const tabs = [
  [
    'Dashboard',
    LayoutDashboard,
    DashboardTab,
  ],
  ['Students', Users, StudentsTab],
  ['Domains', Layers3, DomainsTab],
  ['Questions', HelpCircle, QuestionsTab],
  ['Tests', ClipboardList, TestsTab],
  ['Results', FileCheck2, ResultsTab],
];

export default function AdminPanel() {
  const [tab, setTab] = useState('Dashboard');
  const [loggingOut, setLoggingOut] =
    useState(false);
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(0);

  const { logout } = useAuth();
  const navigate = useNavigate();

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, type = 'success') => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { id, message, type }]);
  }, []);

  const Component =
    tabs.find((x) => x[0] === tab)?.[2] ||
    DashboardTab;

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } catch (e) {
      // Navigation should still happen even if
      // the logout request fails.
    } finally {
      navigate('/login', {
        replace: true,
      });

      setLoggingOut(false);
    }
  };

  return (
    <ToastContext.Provider value={notify}>
      <div className="min-h-screen bg-stone-100">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
          {/* Header */}
          <header className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-700 text-white flex items-center justify-center">
                    <LayoutDashboard size={22} />
                  </div>

                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                      VProTech Admin Dashboard
                    </h1>

                    <p className="text-sm text-slate-500">
                      Manage students, domains, questions,
                      tests and results.
                    </p>
                  </div>
                </div>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <LogOut size={17} />

                {loggingOut
                  ? 'Logging out...'
                  : 'Logout'}
              </button>
            </div>
          </header>

          {/* Navigation */}
          <nav className="bg-white rounded-xl shadow-sm border border-slate-100 p-2 flex gap-1 overflow-x-auto">
            {tabs.map(
              ([name, Icon]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={`shrink-0 px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition ${
                    tab === name
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon size={16} />
                  {name}
                </button>
              )
            )}
          </nav>

          {/* Current tab */}
          <main>
            <Component />
          </main>
        </div>
      </div>
      <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
