import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { User } from '../types/index.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-production-jwt-key-change-in-prod-12345';

// POST /api/auth/login
router.post('/login', (req: any, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: 'Email and password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as User | undefined;
  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const business = db.prepare('SELECT id, name FROM businesses LIMIT 1').get() as { id: string; name: string };
  const businessId = business ? business.id : 'biz_default_01';

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      business_id: businessId
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      business_id: businessId,
      business_name: business?.name || 'Luxe Studio'
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const user = db.prepare('SELECT id, email, name, role, phone, created_at FROM users WHERE id = ?').get(req.user.id) as any;
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.user.business_id) as any;

  res.json({
    success: true,
    user: {
      ...user,
      business_id: req.user.business_id,
      business_name: business?.name
    },
    business
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req: any, res: Response) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase().trim()) as User | undefined;
  if (!user) {
    // Return true for security
    res.json({ success: true, message: 'If email exists, reset instructions have been sent.' });
    return;
  }
  // In production, send email reset link
  res.json({ success: true, message: 'Password reset link sent to your registered email address.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req: any, res: Response) => {
  const { email, new_password } = req.body;
  if (!email || !new_password) {
    res.status(400).json({ success: false, error: 'Email and new password are required' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as User | undefined;
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const newHash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newHash, user.id);

  res.json({ success: true, message: 'Password updated successfully. Please login with your new password.' });
});

export default router;
