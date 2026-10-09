import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Domain, User } from '../models/index.js';
import { auth, wrap } from '../middleware/auth.js';

const r = Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 864e5,
  path: '/',
};

const setCookie = (res, u) => res.cookie(
  'token',
  jwt.sign({ id: u._id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '1d' }),
  cookieOptions
);

const pub = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  branch: u.branch,
  semester: u.semester,
  collegeName: u.collegeName,
  domainId: u.domainId?._id || u.domainId || null,
  domainName: u.domainId?.name || null,
  role: u.role,
});

const cleanEmail = (email) => String(email || '').trim().toLowerCase();

r.post('/register', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = cleanEmail(req.body.email);
  const phone = String(req.body.phone || '').trim();
  const collegeName = String(req.body.collegeName || '').trim();
  const branch = String(req.body.branch || '').trim();
  const semester = String(req.body.semester || '').trim();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!name || !email || !phone || !collegeName || !branch || !semester || !password || !confirmPassword)
    return res.status(400).json({ success: false, message: 'All fields are required' });
  if (!/^\d{10}$/.test(phone))
    return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  if (password.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  if (password !== confirmPassword)
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  if (await User.exists({ email }))
    return res.status(409).json({ success: false, message: 'Email already registered' });

  await User.create({
    name, email, phone, collegeName, branch, semester,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'student',
  });

  // Registration never creates an authenticated session.
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please login to continue.',
  });
}));

r.post('/login', wrap(async (req, res) => {
  const email = cleanEmail(req.body.email);
  const password = String(req.body.password || '');
  const u = await User.findOne({ email }).select('+passwordHash').populate('domainId', 'name');
  if (!u || !(await bcrypt.compare(password, u.passwordHash)))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });

  setCookie(res, u);
  res.json({ success: true, user: pub(u) });
}));

r.get('/me', auth(), wrap(async (req, res) => {
  const u = await User.findById(req.user._id).populate('domainId', 'name');
  res.json({ success: true, user: pub(u) });
}));

r.post('/logout', (req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ success: true, message: 'Logged out' });
});

r.get('/domains', auth('student'), wrap(async (req, res) => {
  res.json(await Domain.find({ isActive: true }).select('name description').sort('name').lean());
}));

r.put('/domain', auth('student'), wrap(async (req, res) => {
  const domainId = req.body.domainId;
  if (!domainId || !String(domainId).match(/^[0-9a-fA-F]{24}$/))
    return res.status(400).json({ success: false, message: 'Invalid domain' });

  const domain = await Domain.findOne({ _id: domainId, isActive: true }).select('_id name').lean();
  if (!domain) return res.status(404).json({ success: false, message: 'Domain is not available' });

  const u = await User.findByIdAndUpdate(req.user._id, { domainId: domain._id }, { new: true })
    .select('name email phone collegeName branch semester domainId role').populate('domainId', 'name');
  res.json({ success: true, user: pub(u) });
}));

export default r;
