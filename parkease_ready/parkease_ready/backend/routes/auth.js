// backend/routes/auth.js
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authMiddleware } = require('../middleware/auth');

const SECRET  = process.env.JWT_SECRET || 'parkease_secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ── POST /api/auth/signup ──────────────────────────────────
router.post('/signup', async (req, res) => {
  const { name, email, password, contactNumber, vehicleType, plateNumber } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, contact_number, vehicle_type, plate_number, role)
       VALUES (?, ?, ?, ?, ?, ?, 'user')`,
      [name, email, hash, contactNumber || null, vehicleType || '4-wheel', plateNumber || null]
    );

    const token = jwt.sign({ id: result.insertId, email, role: 'user' }, SECRET, { expiresIn: EXPIRES });
    res.status(201).json({
      token,
      user: { id: result.insertId, name, email, role: 'user', vehicleType: vehicleType || '4-wheel', plateNumber }
    });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: EXPIRES });
    res.json({
      token,
      user: {
        id:            user.id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        vehicleType:   user.vehicle_type,
        plateNumber:   user.plate_number,
        contactNumber: user.contact_number
      }
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, contact_number, vehicle_type, plate_number, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const u = rows[0];
    res.json({
      id: u.id, name: u.name, email: u.email, role: u.role,
      contactNumber: u.contact_number, vehicleType: u.vehicle_type,
      plateNumber: u.plate_number, createdAt: u.created_at
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, contactNumber, vehicleType, plateNumber } = req.body;
  try {
    await db.query(
      'UPDATE users SET name=?, contact_number=?, vehicle_type=?, plate_number=? WHERE id=?',
      [name, contactNumber, vehicleType, plateNumber, req.user.id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
