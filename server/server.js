import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/auth.js';
import examRoutes from './routes/exam.js';
import adminRoutes from './routes/admin.js';
import { User, Domain, Submission, Test } from './models/index.js';
import { gradeMcq } from './utils/grade.js';

const app = express();
app.set('trust proxy', 1);

const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(helmet());
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again later' },
}));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/admin', adminRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));

app.use((err, req, res, next) => {
  const code = err.name === 'ValidationError' || err.name === 'CastError' ? 400 : err.code === 11000 ? 409 : 500;
  if (code === 500) console.error(err);
  res.status(code).json({ success: false, message: code === 500 ? 'Server error' : err.message });
});

const expireAttempts = async () => {
  const now = new Date();
  const expired = await Submission.find({ status: 'in-progress', deadline: { $lte: now } }).select('_id testId answers').limit(500).lean();
  if (!expired.length) return;
  const tests = await Test.find({ _id: { $in: expired.map((s) => s.testId) } }).populate('questions').lean();
  const byId = new Map(tests.map((t) => [String(t._id), t]));
  await Promise.all(expired.map(async (s) => {
    const test = byId.get(String(s.testId));
    const score = test ? gradeMcq(test.questions, (s.answers instanceof Map ? Object.fromEntries(s.answers) : (s.answers || {}))) : 0;
    await Submission.updateOne(
      { _id: s._id, status: 'in-progress', deadline: { $lte: now } },
      { $set: { score, status: 'auto-submitted', submittedAt: now } }
    );
  }));
};

await mongoose.connect(process.env.MONGO_URI);

await User.updateMany({ role: 'candidate' }, { $set: { role: 'student' } });

const defaultDomains = ['MERN Stack', '.NET', 'Java', 'Python', 'Frontend Development', 'Full Stack Development'];
for (const name of defaultDomains) {
  await Domain.updateOne({ name }, { $setOnInsert: { name, description: `${name} assessment domain`, isActive: true } }, { upsert: true });
}

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD && !(await User.exists({ role: 'admin' }))) {
  await User.create({
    name: 'VproTech Admin', email: ADMIN_EMAIL.toLowerCase(), phone: '0000000000',
    role: 'admin', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
  });
}

const interval = setInterval(() => expireAttempts().catch((e) => console.error('Expiry worker:', e)), 5000);
const shutdown = async () => { clearInterval(interval); await mongoose.disconnect(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(process.env.PORT || 5000, () => console.log(`API running on http://localhost:${process.env.PORT || 5000}`));
