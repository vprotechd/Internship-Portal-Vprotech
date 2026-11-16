import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Token pehle Authorization header se, warna cookie se
export const getToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.token || null;
};

export const auth = (role) => async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (role && user.role !== role) return res.status(403).json({ success: false, message: 'Forbidden' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
};

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);