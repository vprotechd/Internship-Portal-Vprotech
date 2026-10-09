import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';

import api, { msg } from '../api';

const inp =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100';
const btn =
  'px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:bg-slate-800';
const card = 'bg-white rounded-xl shadow-sm border border-slate-100 p-4';

const blank = {
  questionText: '',
  questionType: 'mcq',
  options: ['', '', '', ''],
  correctOption: 0,
  difficulty: 'easy',
  marks: 1,
  instructions: '',
};

const getId = (value) =>
  String(value?._id || value?.id || value || '');

export default function DomainQuestions() {
  const { domainId } = useParams();
  const navigate = useNavigate();

  const [domain, setDomain] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [f, setF] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const { data: domains } = await api.get('/admin/domains');
      setDomain(domains.find((d) => d._id === domainId) || null);

      try {
        const { data: qs } = await api.get('/admin/questions');
        setQuestions(
          qs.filter((question) => getId(question.domainId) === getId(domainId))
        );
      } catch (e) {
        setQuestions([]);
        setLoadError(msg(e));
      }
    } catch (e) {
      setLoadError(msg(e));
    } finally {
      setLoading(false);
    }
  }, [domainId]);

  const domainQuestions = questions.filter(
    (question) => getId(question.domainId) === getId(domainId)
  );

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setOk('');
    setSaving(true);
    try {
      const payload = {
        ...f,
        domainId,
        options: f.questionType === 'mcq' ? f.options : [],
        correctOption: Number(f.correctOption),
        marks: Number(f.marks),
      };
      const { data: savedQuestion } = editId
        ? await api.put(`/admin/questions/${editId}`, payload)
        : await api.post('/admin/questions', payload);
      if (getId(savedQuestion?.domainId) !== getId(domainId)) {
        throw new Error(
          'The server saved this question without assigning it to the selected domain. Deploy or restart the updated backend, then save the question again.'
        );
      }

      setF(blank);
      setEditId(null);
      setOk(editId ? 'Question updated.' : 'Question saved.');
      await load();
    } catch (x) {
      setErr(msg(x));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (q) => {
    setEditId(q._id);
    setOk('');
    setErr('');
    setF({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options?.length ? q.options : ['', '', '', ''],
      correctOption: q.correctOption ?? 0,
      difficulty: q.difficulty,
      marks: q.marks,
      instructions: q.instructions || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (q) => {
    if (!confirm('Delete this question?')) return;
    setErr('');
    setOk('');
    try {
      await api.delete(`/admin/questions/${q._id}`);
      if (editId === q._id) {
        setEditId(null);
        setF(blank);
      }
      setOk('Question deleted.');
      await load();
    } catch (x) {
      setErr(msg(x));
    }
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <header className={`${card} flex items-center gap-3`}>
          <button
            type="button"
            className="px-3 py-2 rounded-lg text-sm border hover:bg-slate-50 inline-flex items-center gap-2"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {domain ? `${domain.name} – Questions` : 'Domain Questions'}
            </h1>
            <p className="text-sm text-slate-500">
              Questions added here belong only to this domain.
            </p>
          </div>
        </header>

        {loadError && (
          <p role="alert" className="text-sm text-red-800 bg-red-50 p-3 rounded-lg">
            {loadError}
          </p>
        )}

        {!loading && !loadError && !domain && (
          <p className="text-sm text-red-800 bg-red-50 p-3 rounded-lg">Domain not found.</p>
        )}

        {domain && (
          <div className="grid lg:grid-cols-2 gap-4">
            <form onSubmit={submit} className={`${card} space-y-3 self-start`}>
              <h2 className="font-semibold text-slate-800">
                {editId ? 'Edit Question' : `Add Question to ${domain.name}`}
              </h2>

              <textarea
                className={inp}
                rows={3}
                required
                maxLength={10000}
                placeholder="Enter question text"
                value={f.questionText}
                onChange={(e) => setF({ ...f, questionText: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-2">
                <select
                  className={inp}
                  value={f.questionType}
                  onChange={(e) => setF({ ...f, questionType: e.target.value })}
                >
                  <option value="mcq">MCQ</option>
                  <option value="coding">Coding</option>
                </select>
                <select
                  className={inp}
                  value={f.difficulty}
                  onChange={(e) => setF({ ...f, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  className={inp}
                  aria-label="Question marks"
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={f.marks}
                  onChange={(e) => setF({ ...f, marks: e.target.value })}
                />
              </div>

              {f.questionType === 'mcq' ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {f.options.map((option, i) => (
                      <input
                        key={i}
                        className={inp}
                        required
                        maxLength={1000}
                        placeholder={`Option ${i + 1}`}
                        value={option}
                        onChange={(e) =>
                          setF({
                            ...f,
                            options: f.options.map((o, j) => (i === j ? e.target.value : o)),
                          })
                        }
                      />
                    ))}
                  </div>
                  <label className="block text-xs font-medium text-slate-600">
                    Correct option
                    <select
                      className={`${inp} mt-1`}
                      value={f.correctOption}
                      onChange={(e) => setF({ ...f, correctOption: Number(e.target.value) })}
                    >
                      {f.options.map((_, i) => (
                        <option key={i} value={i}>
                          Option {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <textarea
                  className={inp}
                  rows={3}
                  placeholder="Coding instructions (optional)"
                  value={f.instructions}
                  onChange={(e) => setF({ ...f, instructions: e.target.value })}
                />
              )}

              {err && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-2">
                  {err}
                </p>
              )}
              {ok && <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg p-2">{ok}</p>}

              <div className="flex gap-2">
                <button className={btn} disabled={saving}>
                  {saving ? 'Saving…' : editId ? 'Update Question' : 'Save Question'}
                </button>
                {editId && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg text-sm border hover:bg-slate-50"
                    onClick={() => {
                      setEditId(null);
                      setF(blank);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-2">
              <h2 className="font-semibold text-slate-800">
                {domainQuestions.length} question{domainQuestions.length === 1 ? '' : 's'} in {domain.name}
              </h2>
              {loading && <p className="text-sm text-slate-500">Loading questions...</p>}
              {!loading && !domainQuestions.length && (
                <p className="text-sm text-slate-500">No questions added to this domain yet.</p>
              )}
              {domainQuestions.map((q) => (
                <div key={q._id} className={`${card} space-y-2`}>
                  <p className="text-sm text-slate-800">{q.questionText}</p>
                  <p className="text-xs text-slate-500">
                    {q.questionType} · {q.difficulty} · {q.marks} mark{q.marks === 1 ? '' : 's'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-sm border hover:bg-slate-50"
                      onClick={() => startEdit(q)}
                    >
                      <Pencil size={14} className="inline mr-1" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-sm border hover:bg-red-50"
                      onClick={() => remove(q)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
