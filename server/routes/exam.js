import { Router } from 'express';
import mongoose from 'mongoose';
import { Test, Submission } from '../models/index.js';
import { auth, wrap } from '../middleware/auth.js';
import { gradeMcq } from '../utils/grade.js';

const r = Router();
r.use(auth('student'));

const validId = (id) => mongoose.isValidObjectId(id);

const safeQuestions = (questions) => questions.map((q) => {
  const o = q.toObject ? q.toObject() : q;
  delete o.correctOption;
  return o;
});

const finalizeExpired = async (s, test, answers = null) => {
  if (!s || s.status !== 'in-progress') return s;
  if (Date.now() < new Date(s.deadline).getTime()) return s;
  const finalAnswers = answers && typeof answers === 'object' ? answers : (s.answers instanceof Map ? Object.fromEntries(s.answers) : (s.answers || {}));
  const questions = test?.questions || await Test.findById(s.testId).populate('questions');
  s.answers = finalAnswers;
  s.score = gradeMcq(questions, finalAnswers);
  s.status = 'auto-submitted';
  s.submittedAt = new Date();
  await s.save();
  return s;
};

const getTestForStudent = async (id, student, requireReleased = true) => {
  if (!validId(id)) return null;
  const query = {
    _id: id,
    isActive: true,
    domainId: student.domainId,
    ...(requireReleased ? { isReleased: true } : {}),
  };
  return Test.findOne(query).populate({ path: 'questions', select: '-correctOption' });
};

const loadAttempt = async (id, studentId) => {
  if (!validId(id)) return null;
  return Submission.findOne({ _id: { $exists: true }, testId: id, studentId });
};

r.get('/tests', wrap(async (req, res) => {
  if (!req.user.domainId) return res.json([]);
  const tests = await Test.find({
    isActive: true, isReleased: true, domainId: req.user.domainId,
  }).select('title description durationMinutes passingMarks revealAnswersToPassed questions createdAt').lean();
  const subs = await Submission.find({ studentId: req.user._id }).select('testId status').lean();
  const status = new Map(subs.map((s) => [String(s.testId), s.status]));
  res.json(tests.map((t) => ({
    ...t,
    questionCount: t.questions.length,
    questions: undefined,
    status: status.get(String(t._id)) || 'new',
  })));
}));

r.get('/tests/:id', wrap(async (req, res) => {
  let attempt = await loadAttempt(req.params.id, req.user._id);
  const test = await getTestForStudent(req.params.id, req.user, !attempt || attempt.status !== 'in-progress' ? true : false);
  if (!test) return res.status(404).json({ success: false, message: 'Test not available' });
  if (attempt?.status === 'in-progress') attempt = await finalizeExpired(attempt, test);
  res.json({
    _id: test._id, title: test.title, description: test.description,
    durationMinutes: test.durationMinutes, questionCount: test.questions.length,
    status: attempt?.status || 'new',
  });
}));

r.post('/tests/:id/start', wrap(async (req, res) => {
  let s = await loadAttempt(req.params.id, req.user._id);
  let test = await getTestForStudent(req.params.id, req.user, Boolean(!s || s.status !== 'in-progress'));
  if (!test) return res.status(404).json({ success: false, message: 'Test is not available for your domain' });

  if (s?.status !== 'in-progress') {
    if (s) return res.status(409).json({ success: false, message: 'You have already submitted this test' });
    const now = new Date();
    const randomizedQuestions = [...test.questions].sort(() => Math.random() - 0.5);
    s = await Submission.create({
      questionOrder: randomizedQuestions.map((q) => q._id),
      studentId: req.user._id,
      testId: test._id,
      startedAt: now,
      deadline: new Date(now.getTime() + test.durationMinutes * 60000),
    });
  } else {
    s = await finalizeExpired(s, test);
    if (s.status !== 'in-progress')
      return res.status(409).json({ success: false, message: 'Test time has expired and the test was submitted' });
  }

  if (s.questionOrder?.length) {
    const byId = new Map(test.questions.map((q) => [String(q._id), q]));
    test.questions = s.questionOrder.map((id) => byId.get(String(id))).filter(Boolean);
  }
  res.json({
    success: true,
    test: { ...test.toObject(), questions: safeQuestions(test.questions) },
    deadline: s.deadline,
    remainingSeconds: Math.max(0, Math.ceil((new Date(s.deadline).getTime() - Date.now()) / 1000)),
    tabSwitchCount: s.tabSwitchCount,
    answers: (s.answers instanceof Map ? Object.fromEntries(s.answers) : (s.answers || {})),
  });
}));

r.post('/tests/:id/violation', wrap(async (req, res) => {
  const test = await getTestForStudent(req.params.id, req.user, false);
  if (!test) return res.status(404).json({ success: false, message: 'Test not available' });
  let s = await loadAttempt(req.params.id, req.user._id);
  if (!s) return res.status(404).json({ success: false, message: 'No active attempt' });
  s = await finalizeExpired(s, test);
  if (s.status !== 'in-progress') return res.status(409).json({ success: false, message: 'Test has expired' });
  s = await Submission.findOneAndUpdate(
    { _id: s._id, status: 'in-progress', deadline: { $gt: new Date() } },
    { $inc: { tabSwitchCount: 1 } }, { new: true }
  );
  if (!s) return res.status(409).json({ success: false, message: 'Test has expired' });
  res.json({ success: true, tabSwitchCount: s.tabSwitchCount });
}));

const sanitizeAnswers = (answers, test) => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null;
  const allowed = new Map(test.questions.map((q) => [String(q._id), q]));
  const clean = {};
  for (const [id, value] of Object.entries(answers)) {
    const q = allowed.get(id);
    if (!q) continue;
    if (q.questionType === 'mcq') {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 0 && n < q.options.length) clean[id] = n;
    } else if (typeof value === 'string') {
      clean[id] = value.slice(0, 50000);
    }
  }
  return clean;
};

r.put('/tests/:id/answers', wrap(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, domainId: req.user.domainId, isActive: true }).populate('questions');
  if (!test) return res.status(404).json({ success: false, message: 'Test not available' });
  let s = await loadAttempt(req.params.id, req.user._id);
  if (!s) return res.status(404).json({ success: false, message: 'No active attempt' });
  const answers = sanitizeAnswers(req.body.answers, test);
  if (!answers) return res.status(400).json({ success: false, message: 'Invalid answer payload' });
  s = await finalizeExpired(s, test, answers);
  if (s.status !== 'in-progress') return res.status(409).json({ success: false, message: 'Test has expired and was submitted' });
  s.answers = answers;
  await s.save();
  res.json({ success: true });
}));

r.post('/tests/:id/submit', wrap(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, domainId: req.user.domainId, isActive: true }).populate('questions');
  if (!test) return res.status(404).json({ success: false, message: 'Test not available' });
  let s = await loadAttempt(req.params.id, req.user._id);
  if (!s) return res.status(409).json({ success: false, message: 'No active attempt' });
  const answers = sanitizeAnswers(req.body.answers, test);
  if (!answers) return res.status(400).json({ success: false, message: 'Invalid answer payload' });

  const expired = Date.now() >= new Date(s.deadline).getTime();
  if (expired) {
    await finalizeExpired(s, test, answers);
    return res.json({ success: true, message: 'Test successfully submitted' });
  }

  s.answers = answers;
  s.score = gradeMcq(test.questions, answers);
  s.status = 'submitted';
  s.submittedAt = new Date();
  await s.save();
  res.json({ success: true, message: 'Test successfully submitted' });
}));


r.get('/tests/:id/review', wrap(async (req, res) => {
  const test = await Test.findOne({ _id: req.params.id, domainId: req.user.domainId, isActive: true }).populate('questions');
  if (!test) return res.status(404).json({ success: false, message: 'Test not available' });
  const submission = await Submission.findOne({ testId: test._id, studentId: req.user._id, status: { $in: ['submitted', 'auto-submitted'] } });
  if (!submission) return res.status(404).json({ success: false, message: 'Submit the test before reviewing answers' });
  const total = Number(submission.score || 0) + Number(submission.manualScore || 0);
  if (!test.revealAnswersToPassed || total < Number(test.passingMarks || 0))
    return res.status(403).json({ success: false, message: 'Answer review is available only to students who pass, when enabled by the administrator.' });
  const answers = submission.answers instanceof Map ? Object.fromEntries(submission.answers) : (submission.answers || {});
  res.json({ success: true, score: total, passingMarks: test.passingMarks, questions: test.questions.map((q) => ({ _id: q._id, questionText: q.questionText, questionType: q.questionType, options: q.options, correctOption: q.correctOption, marks: q.marks, instructions: q.instructions, yourAnswer: answers[String(q._id)] ?? null })) });
}));

export default r;
