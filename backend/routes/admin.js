// backend/routes/admin.js — user management (admin only)
const router = require('express').Router();
const db     = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.contact_number, u.vehicle_type,
             u.plate_number, u.created_at,
             COUNT(b.id) as total_bookings
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC`);
    res.json(rows.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      contactNumber: u.contact_number, vehicleType: u.vehicle_type,
      plateNumber: u.plate_number, createdAt: u.created_at,
      totalBookings: u.total_bookings
    })));
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  if (req.params.id == req.user.id) return res.status(400).json({ error: 'Cannot delete yourself.' });
  try {
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
