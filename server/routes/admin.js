import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Domain, Test, Question, Submission, User } from '../models/index.js';
import { auth, wrap } from '../middleware/auth.js';

const r = Router();
r.use(auth('admin'));
const LIMIT = 25;
const validId = (id) => mongoose.isValidObjectId(id);

const text = (v, max = 10000) => String(v ?? '').trim().slice(0, max);
const pageInfo = (v) => Math.max(1, Number.parseInt(v, 10) || 1);
const safeRx = (v) => new RegExp(String(v || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const expireOldAttempts = async () => {
  const now = new Date();
  const expired = await Submission.find({ status: 'in-progress', deadline: { $lte: now } }).select('_id testId answers').limit(500);
  if (!expired.length) return;
  const ids = expired.map((s) => s._id);
  const tests = await Test.find({ _id: { $in: expired.map((s) => s.testId) } }).populate('questions').lean();
  const byId = new Map(tests.map((t) => [String(t._id), t]));
  const { gradeMcq } = await import('../utils/grade.js');
  await Promise.all(expired.map(async (s) => {
    const t = byId.get(String(s.testId));
    const score = t ? gradeMcq(t.questions, (s.answers instanceof Map ? Object.fromEntries(s.answers) : (s.answers || {}))) : 0;
    await Submission.updateOne(
      { _id: s._id, status: 'in-progress', deadline: { $lte: now } },
      { $set: { score, status: 'auto-submitted', submittedAt: now } }
    );
  }));
};

const validateQuestion = (body) => {
  const questionText = text(body.questionText);
  const questionType = body.questionType;
  const difficulty = body.difficulty;
  const marks = Number(body.marks);
  if (!questionText) return 'Question text is required';
  if (!['mcq', 'coding'].includes(questionType)) return 'Invalid question type';
  if (!['easy', 'medium', 'hard'].includes(difficulty)) return 'Invalid difficulty';
  if (!Number.isFinite(marks) || marks < 0) return 'Invalid marks';
  if (questionType === 'mcq') {
    if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 6 || body.options.some((x) => !text(x, 1000)))
      return 'MCQ requires 2-6 non-empty options';
    if (!Number.isInteger(Number(body.correctOption)) || Number(body.correctOption) < 0 || Number(body.correctOption) >= body.options.length)
      return 'Invalid correct option';
  }
  return null;
};

const validateTest = async (body) => {
  const title = text(body.title, 200);
  const durationMinutes = Number(body.durationMinutes);
  const passingMarks = Number(body.passingMarks);
  if (!title) return 'Test title is required';
  if (!validId(body.domainId)) return 'Valid domain is required';
  if (!Number.isFinite(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) return 'Duration must be 1-1440 minutes';
  if (!Number.isFinite(passingMarks) || passingMarks < 0) return 'Invalid passing marks';
  if (!Array.isArray(body.questions) || body.questions.some((id) => !validId(id))) return 'Invalid question IDs';
  if (!(await Domain.exists({ _id: body.domainId }))) return 'Domain not found';
  if (body.questions.length && (await Question.countDocuments({ _id: { $in: body.questions } })) !== body.questions.length)
    return 'One or more questions do not exist';
  return null;
};

r.get('/dashboard', wrap(async (req, res) => {
  await expireOldAttempts();
  const [
    students, domains, tests, activeTests, releasedTests, attempts,
    completed, pendingReviews, passed, failed, domainCounts
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    Domain.countDocuments(),
    Test.countDocuments(),
    Test.countDocuments({ isActive: true }),
    Test.countDocuments({ isActive: true, isReleased: true }),
    Submission.countDocuments(),
    Submission.countDocuments({ status: { $in: ['submitted', 'auto-submitted'] } }),
    Submission.countDocuments({ status: { $in: ['submitted', 'auto-submitted'] }, reviewed: false }),
    Submission.aggregate([
      { $match: { status: { $in: ['submitted', 'auto-submitted'] } } },
      { $lookup: { from: 'tests', localField: 'testId', foreignField: '_id', as: 'test' } },
      { $unwind: '$test' },
      { $match: { $expr: { $gte: [{ $add: ['$score', '$manualScore'] }, '$test.passingMarks'] } } },
      { $count: 'n' },
    ]),
    Submission.aggregate([
      { $match: { status: { $in: ['submitted', 'auto-submitted'] } } },
      { $lookup: { from: 'tests', localField: 'testId', foreignField: '_id', as: 'test' } },
      { $unwind: '$test' },
      { $match: { $expr: { $lt: [{ $add: ['$score', '$manualScore'] }, '$test.passingMarks'] } } },
      { $count: 'n' },
    ]),
    User.aggregate([
      { $match: { role: 'student', domainId: { $ne: null } } },
      { $group: { _id: '$domainId', students: { $sum: 1 } } },
      { $lookup: { from: 'domains', localField: '_id', foreignField: '_id', as: 'domain' } },
      { $unwind: '$domain' },
      { $project: { _id: 0, domainId: '$_id', name: '$domain.name', students: 1 } },
      { $sort: { name: 1 } },
    ]),
  ]);
  res.json({
    totalStudents: students, totalDomains: domains, totalTests: tests,
    activeTests, releasedTests, totalAttempts: attempts, completedAttempts: completed,
    pendingReviews, passed: passed[0]?.n || 0, failed: failed[0]?.n || 0, domainCounts,
  });
}));

r.get('/domains', wrap(async (req, res) => {
  const data = await Domain.aggregate([
    { $lookup: { from: 'users', let: { id: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$domainId', '$$id'] }, { $eq: ['$role', 'student'] }] } } }, { $count: 'n' }], as: 'studentCount' } },
    { $project: { name: 1, description: 1, isActive: 1, createdAt: 1, studentCount: { $ifNull: [{ $arrayElemAt: ['$studentCount.n', 0] }, 0] } } },
    { $sort: { name: 1 } },
  ]);
  res.json(data);
}));

r.post('/domains', wrap(async (req, res) => {
  const name = text(req.body.name, 100);
  const description = text(req.body.description, 500);
  if (!name) return res.status(400).json({ success: false, message: 'Domain name is required' });
  const d = await Domain.create({ name, description, isActive: req.body.isActive !== false });
  res.status(201).json(d);
}));

r.put('/domains/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid domain ID' });
  const updates = {};
  if (req.body.name !== undefined) updates.name = text(req.body.name, 100);
  if (req.body.description !== undefined) updates.description = text(req.body.description, 500);
  if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
  if (!updates.name && req.body.name !== undefined) return res.status(400).json({ success: false, message: 'Domain name is required' });
  const d = await Domain.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  d ? res.json(d) : res.status(404).json({ success: false, message: 'Domain not found' });
}));

r.delete('/domains/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid domain ID' });
  const inUse = await Promise.all([User.exists({ domainId: req.params.id }), Test.exists({ domainId: req.params.id })]);
  if (inUse.some(Boolean)) return res.status(409).json({ success: false, message: 'Domain is in use. Deactivate it instead of deleting it.' });
  await Domain.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

r.get('/questions', wrap(async (req, res) => {
  res.json(await Question.find().sort('-createdAt').lean());
}));
r.post('/questions', wrap(async (req, res) => {
  const error = validateQuestion(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const q = await Question.create({
    questionText: text(req.body.questionText), questionType: req.body.questionType,
    difficulty: req.body.difficulty, marks: Number(req.body.marks),
    options: req.body.questionType === 'mcq' ? req.body.options.map((x) => text(x, 1000)) : [],
    correctOption: req.body.questionType === 'mcq' ? Number(req.body.correctOption) : undefined,
    instructions: text(req.body.instructions, 5000),
  });
  res.status(201).json(q);
}));
r.put('/questions/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid question ID' });
  const error = validateQuestion(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const q = await Question.findByIdAndUpdate(req.params.id, {
    questionText: text(req.body.questionText), questionType: req.body.questionType,
    difficulty: req.body.difficulty, marks: Number(req.body.marks),
    options: req.body.questionType === 'mcq' ? req.body.options.map((x) => text(x, 1000)) : [],
    correctOption: req.body.questionType === 'mcq' ? Number(req.body.correctOption) : undefined,
    instructions: text(req.body.instructions, 5000),
  }, { new: true, runValidators: true });
  q ? res.json(q) : res.status(404).json({ success: false, message: 'Question not found' });
}));
r.delete('/questions/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid question ID' });
  if (await Test.exists({ questions: req.params.id })) return res.status(409).json({ success: false, message: 'Question is assigned to a test. Remove it from tests first.' });
  await Question.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

r.get('/tests', wrap(async (req, res) => {
  const data = await Test.find().populate('domainId', 'name').populate('questions', '_id').sort('-createdAt').lean();
  res.json(data);
}));
r.post('/tests', wrap(async (req, res) => {
  const error = await validateTest(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const t = await Test.create({
    title: text(req.body.title, 200), description: text(req.body.description, 5000),
    domainId: req.body.domainId, durationMinutes: Number(req.body.durationMinutes),
    passingMarks: Number(req.body.passingMarks), questions: [...new Set(req.body.questions)],
    isActive: req.body.isActive !== false, isReleased: false,
  });
  res.status(201).json(await t.populate('domainId', 'name'));
}));
r.put('/tests/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid test ID' });
  const error = await validateTest(req.body);
  if (error) return res.status(400).json({ success: false, message: error });
  const current = await Test.findById(req.params.id);
  if (!current) return res.status(404).json({ success: false, message: 'Test not found' });
  current.title = text(req.body.title, 200);
  current.description = text(req.body.description, 5000);
  current.domainId = req.body.domainId;
  current.durationMinutes = Number(req.body.durationMinutes);
  current.passingMarks = Number(req.body.passingMarks);
  current.questions = [...new Set(req.body.questions)];
  current.isActive = req.body.isActive !== false;
  await current.save();
  res.json(await current.populate('domainId', 'name'));
}));
r.delete('/tests/:id', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid test ID' });
  if (await Submission.exists({ testId: req.params.id })) return res.status(409).json({ success: false, message: 'Test has submissions and cannot be deleted. Stop it instead.' });
  await Test.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));
r.post('/tests/:id/release', wrap(async (req, res) => {
  const t = await Test.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Test not found' });
  if (!t.isActive) return res.status(400).json({ success: false, message: 'Activate the test before releasing it' });
  if (!t.questions.length) return res.status(400).json({ success: false, message: 'Add questions before releasing the test' });
  t.isReleased = true; await t.save();
  res.json({ success: true, message: 'Test allowed', test: t });
}));
r.post('/tests/:id/stop', wrap(async (req, res) => {
  const t = await Test.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: 'Test not found' });
  t.isReleased = false; await t.save();
  res.json({ success: true, message: 'Test stopped', test: t });
}));

const resultMatch = (query) => {
  const match = {};
  if (validId(query.testId)) match.testId = new mongoose.Types.ObjectId(query.testId);
  if (validId(query.studentId)) match.studentId = new mongoose.Types.ObjectId(query.studentId);
  if (query.status && ['in-progress', 'submitted', 'auto-submitted'].includes(query.status)) match.status = query.status;
  return match;
};

r.get('/results', wrap(async (req, res) => {
  await expireOldAttempts();
  const page = pageInfo(req.query.page);
  const match = resultMatch(req.query);
  const q = text(req.query.q, 100);
  const pipeline = [{ $match: match }];
  if (q) {
    pipeline.push(
      { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: '$student' },
      { $match: { $or: [{ 'student.name': safeRx(q) }, { 'student.email': safeRx(q) }, { 'student.collegeName': safeRx(q) }] } }
    );
  }
  const base = [...pipeline, { $count: 'n' }];
  const dataPipeline = [
    ...pipeline,
    { $sort: { submittedAt: -1, _id: -1 } },
    { $skip: (page - 1) * LIMIT },
    { $limit: LIMIT },
    { $lookup: { from: 'users', localField: 'studentId', foreignField: '_id', as: 'student' } },
    { $unwind: '$student' },
    { $lookup: { from: 'domains', localField: 'student.domainId', foreignField: '_id', as: 'domain' } },
    { $unwind: { path: '$domain', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'tests', localField: 'testId', foreignField: '_id', as: 'test' } },
    { $unwind: '$test' },
    { $project: {
      _id: 1, score: 1, manualScore: 1, reviewed: 1, status: 1, tabSwitchCount: 1,
      startedAt: 1, submittedAt: 1, passingMarks: '$test.passingMarks',
      student: { name: 1, email: 1, phone: 1, collegeName: 1 },
      domain: { name: 1 }, test: { title: 1 },
    } },
  ];
  const [countRows, rows] = await Promise.all([Submission.aggregate(base), Submission.aggregate(dataPipeline)]);
  const total = countRows[0]?.n || 0;
  const completed = await Submission.countDocuments({ ...match, status: { $in: ['submitted', 'auto-submitted'] } });
  const allForPass = await Submission.aggregate([
    ...pipeline,
    { $lookup: { from: 'tests', localField: 'testId', foreignField: '_id', as: 'test' } },
    { $unwind: '$test' },
    { $match: { status: { $in: ['submitted', 'auto-submitted'] } } },
    { $group: { _id: null, passed: { $sum: { $cond: [{ $gte: [{ $add: ['$score', '$manualScore'] }, '$test.passingMarks'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $lt: [{ $add: ['$score', '$manualScore'] }, '$test.passingMarks'] }, 1, 0] } } } },
  ]);
  res.json({ rows, page, pages: Math.max(1, Math.ceil(total / LIMIT)), total, completed, stats: allForPass[0] || { passed: 0, failed: 0 } });
}));

r.get('/results/export.csv', wrap(async (req, res) => {
  await expireOldAttempts();
  const match = resultMatch(req.query);
  const cursor = Submission.find(match).populate({ path: 'studentId', select: 'name email phone collegeName domainId', populate: { path: 'domainId', select: 'name' } }).populate('testId', 'title passingMarks').sort({ submittedAt: -1 }).lean().cursor();
  const esc = (v) => {
    const t = String(v ?? '');
    const safe = /^[=+\-@]/.test(t) ? `'${t}` : t;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  res.type('text/csv').attachment('results.csv');
  res.write(['Student', 'Email', 'Phone', 'College', 'Domain', 'Test', 'Score', 'Passing Marks', 'Pass/Fail', 'Status', 'Tab Switches', 'Submitted At'].map(esc).join(',') + '\n');
  for await (const s of cursor) {
    const u = s.studentId || {}, t = s.testId || {};
    const total = Number(s.score || 0) + Number(s.manualScore || 0);
    const row = [u.name, u.email, u.phone, u.collegeName, u.domainId?.name, t.title, total, t.passingMarks, total >= t.passingMarks ? 'Pass' : 'Fail', s.status, s.tabSwitchCount, s.submittedAt?.toISOString()];
    res.write(row.map(esc).join(',') + '\n');
  }
  res.end();
}));

r.get('/results/:id', wrap(async (req, res) => {
  await expireOldAttempts();
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid result ID' });
  const s = await Submission.findById(req.params.id)
    .populate('studentId', 'name email phone collegeName domainId')
    .populate({ path: 'testId', populate: { path: 'questions' } }).lean();
  if (!s) return res.status(404).json({ success: false, message: 'Result not found' });
  res.json(s);
}));

r.put('/results/:id/grade', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid result ID' });
  const manualScore = Number(req.body.manualScore);
  if (!Number.isFinite(manualScore) || manualScore < 0) return res.status(400).json({ success: false, message: 'Invalid marks' });
  const s = await Submission.findById(req.params.id).populate({ path: 'testId', populate: 'questions' });
  if (!s) return res.status(404).json({ success: false, message: 'Result not found' });
  const codingMax = s.testId.questions.filter((q) => q.questionType === 'coding').reduce((n, q) => n + Number(q.marks || 1), 0);
  if (manualScore > codingMax) return res.status(400).json({ success: false, message: `Manual marks cannot exceed ${codingMax}` });
  s.manualScore = manualScore; s.reviewed = true; await s.save();
  res.json({ success: true, manualScore: s.manualScore });
}));

r.get('/users', wrap(async (req, res) => {
  const page = pageInfo(req.query.page);
  const q = text(req.query.q, 100);
  const filter = { role: 'student' };
  if (q) { const rx = safeRx(q); filter.$or = [{ name: rx }, { email: rx }, { collegeName: rx }]; }
  if (validId(req.query.domainId)) filter.domainId = req.query.domainId;
  const [rows, total] = await Promise.all([
    User.find(filter).select('name email phone collegeName domainId role createdAt').populate('domainId', 'name').sort('-createdAt').skip((page - 1) * LIMIT).limit(LIMIT).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ rows, page, pages: Math.max(1, Math.ceil(total / LIMIT)), total });
}));
r.post('/users/:id/reset-password', wrap(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });
  const password = String(req.body.password || '');
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password min 6 chars' });
  const u = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!u) return res.status(404).json({ success: false, message: 'Student not found' });
  u.passwordHash = await bcrypt.hash(password, 12); await u.save();
  res.json({ success: true, message: 'Password updated' });
}));

export default r;
