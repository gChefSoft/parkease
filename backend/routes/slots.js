// backend/routes/slots.js
const router = require('express').Router();
const db     = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ── GET /api/slots — list all slots (public) ───────────────
router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query;
    let sql = 'SELECT * FROM parking_slots WHERE 1=1';
    const params = [];
    if (type)   { sql += ' AND type = ?';   params.push(type); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY row_pos, col_pos';
    const [rows] = await db.query(sql, params);
    res.json(rows.map(s => ({
      id:          s.id,
      slotNumber:  s.slot_number,
      type:        s.type,
      status:      s.status,
      price:       parseFloat(s.price_per_hour),
      position:    { row: s.row_pos, col: s.col_pos }
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/slots/stats — summary stats (public) ─────────
router.get('/stats', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT type, status, COUNT(*) as count
      FROM parking_slots
      GROUP BY type, status
    `);
    const stats = {};
    for (const r of rows) {
      if (!stats[r.type]) stats[r.type] = { total: 0, available: 0, occupied: 0 };
      stats[r.type].total += r.count;
      if (r.status === 'available') stats[r.type].available += r.count;
      if (r.status === 'occupied')  stats[r.type].occupied  += r.count;
    }
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/slots — add slot (admin) ────────────────────
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { slotNumber, type, pricePerHour, rowPos, colPos } = req.body;
  if (!slotNumber || !type) {
    return res.status(400).json({ error: 'slotNumber and type are required.' });
  }
  try {
    const prices = { '2-wheel': 20, '4-wheel': 50, '6-wheel': 80 };
    const price  = pricePerHour || prices[type] || 50;
    const [result] = await db.query(
      'INSERT INTO parking_slots (slot_number, type, price_per_hour, row_pos, col_pos) VALUES (?,?,?,?,?)',
      [slotNumber, type, price, rowPos || 0, colPos || 0]
    );
    res.status(201).json({ id: result.insertId, slotNumber, type, price, status: 'available' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Slot number already exists.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/slots/:id — update slot (admin) ──────────────
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { status, pricePerHour } = req.body;
  try {
    await db.query('UPDATE parking_slots SET status=?, price_per_hour=? WHERE id=?',
      [status, pricePerHour, req.params.id]);
    res.json({ message: 'Slot updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── DELETE /api/slots/:id — remove slot (admin) ───────────
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM parking_slots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Slot deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
