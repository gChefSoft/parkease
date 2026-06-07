// backend/routes/contact.js
const router = require('express').Router();
const db     = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// POST /api/contact — submit contact form (public)
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  try {
    await db.query(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)',
      [name, email, subject || '', message]);
    res.status(201).json({ message: 'Message sent successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/contact — view messages (admin)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
