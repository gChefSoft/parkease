// backend/routes/bookings.js
const router = require('express').Router();
const db     = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ── GET /api/bookings/my — user's own bookings ─────────────
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT b.*, s.type as vehicle_type_slot, s.price_per_hour
      FROM bookings b
      JOIN parking_slots s ON b.slot_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(rows.map(mapBooking));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/bookings — all bookings (admin) ──────────────
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    let sql = `
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE 1=1`;
    const params = [];
    if (status) { sql += ' AND b.status = ?'; params.push(status); }
    sql += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(sql, params);
    res.json(rows.map(r => ({
      ...mapBooking(r),
      userName:  r.user_name,
      userEmail: r.user_email
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/bookings — create booking ───────────────────
router.post('/', authMiddleware, async (req, res) => {
  const { slotId, duration, paymentMethod, vehiclePlate } = req.body;
  if (!slotId || !duration) {
    return res.status(400).json({ error: 'slotId and duration are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Lock & check slot availability
    const [[slot]] = await conn.query(
      'SELECT * FROM parking_slots WHERE id = ? FOR UPDATE', [slotId]);
    if (!slot) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Slot not found.' }); }
    if (slot.status !== 'available') { await conn.rollback(); conn.release(); return res.status(409).json({ error: 'Slot is not available.' }); }

    const startTime  = new Date();
    const endTime    = new Date(startTime.getTime() + duration * 3600000);
    const totalPrice = parseFloat(slot.price_per_hour) * parseFloat(duration);

    const [result] = await conn.query(
      `INSERT INTO bookings (user_id, slot_id, slot_number, start_time, end_time, duration, total_price, status, payment_method, vehicle_plate)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [req.user.id, slotId, slot.slot_number, startTime, endTime, duration, totalPrice, paymentMethod || 'cash', vehiclePlate || null]
    );

    await conn.query('UPDATE parking_slots SET status = ? WHERE id = ?', ['occupied', slotId]);
    await conn.commit();
    conn.release();

    res.status(201).json({
      id: result.insertId, slotNumber: slot.slot_number,
      startTime, endTime, duration, totalPrice, status: 'active'
    });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('[create booking]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/bookings/:id/end — end/checkout booking ──────
router.put('/:id/end', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[booking]] = await conn.query(
      'SELECT * FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE',
      [req.params.id, req.user.id]);
    if (!booking) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Booking not found.' }); }
    if (booking.status !== 'active') { await conn.rollback(); conn.release(); return res.status(409).json({ error: 'Booking is not active.' }); }

    const endTime  = new Date();
    const duration = (endTime - new Date(booking.start_time)) / 3600000;
    const [[slot]] = await conn.query('SELECT price_per_hour FROM parking_slots WHERE id = ?', [booking.slot_id]);
    const totalPrice = parseFloat(slot.price_per_hour) * duration;

    await conn.query(
      'UPDATE bookings SET status=?, end_time=?, duration=?, total_price=? WHERE id=?',
      ['completed', endTime, duration.toFixed(2), totalPrice.toFixed(2), booking.id]);
    await conn.query('UPDATE parking_slots SET status=? WHERE id=?', ['available', booking.slot_id]);

    await conn.commit(); conn.release();
    res.json({ message: 'Booking ended.', totalPrice: totalPrice.toFixed(2), duration: duration.toFixed(2) });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PUT /api/bookings/:id/cancel ──────────────────────────
router.put('/:id/cancel', authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query(
      'SELECT * FROM bookings WHERE id = ? AND (user_id = ? OR ? = "admin") FOR UPDATE',
      [req.params.id, req.user.id, req.user.role]);
    if (!booking || booking.status === 'completed') {
      await conn.rollback(); conn.release();
      return res.status(404).json({ error: 'Cannot cancel this booking.' });
    }
    await conn.query('UPDATE bookings SET status=? WHERE id=?', ['cancelled', booking.id]);
    await conn.query('UPDATE parking_slots SET status=? WHERE id=?', ['available', booking.slot_id]);
    await conn.commit(); conn.release();
    res.json({ message: 'Booking cancelled.' });
  } catch (err) {
    await conn.rollback(); conn.release();
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/bookings/admin/stats — dashboard stats ───────
router.get('/admin/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [[revenue]]  = await db.query(`SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status IN ('completed','active')`);
    const [[todayRev]] = await db.query(`SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status IN ('completed','active') AND DATE(created_at)=CURDATE()`);
    const [[weekRev]]  = await db.query(`SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status IN ('completed','active') AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
    const [[monthRev]] = await db.query(`SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status IN ('completed','active') AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())`);
    const [[yearRev]]  = await db.query(`SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status IN ('completed','active') AND YEAR(created_at)=YEAR(NOW())`);
    const [[today]]    = await db.query(`SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at)=CURDATE()`);
    const [[active]]   = await db.query(`SELECT COUNT(*) as count FROM bookings WHERE status='active'`);
    const [[users]]    = await db.query(`SELECT COUNT(*) as count FROM users WHERE role='user'`);
    const [monthly]    = await db.query(`
      SELECT DATE_FORMAT(MIN(created_at),'%b') as month,
             COUNT(*) as bookings,
             COALESCE(SUM(total_price),0) as revenue
      FROM bookings
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      AND status IN ('completed','active')
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY YEAR(created_at), MONTH(created_at)`);
    res.json({
      totalRevenue:  parseFloat(revenue.total),
      todayRevenue:  parseFloat(todayRev.total),
      weekRevenue:   parseFloat(weekRev.total),
      monthRevenue:  parseFloat(monthRev.total),
      yearRevenue:   parseFloat(yearRev.total),
      todayBookings: today.count,
      activeBookings: active.count,
      totalUsers: users.count,
      monthly
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: err.message });
  }
});

function mapBooking(r) {
  return {
    id:            r.id,
    userId:        r.user_id,
    slotId:        r.slot_id,
    slotNumber:    r.slot_number,
    startTime:     r.start_time,
    endTime:       r.end_time,
    duration:      r.duration ? parseFloat(r.duration) : null,
    totalPrice:    r.total_price ? parseFloat(r.total_price) : null,
    status:        r.status,
    paymentMethod: r.payment_method,
    vehiclePlate:  r.vehicle_plate,
    createdAt:     r.created_at
  };
}

module.exports = router;