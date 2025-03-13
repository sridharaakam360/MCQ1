const db = require('../config/db').pool;
const { ApiError } = require('../utils/errors');
const { catchAsync } = require('../utils/errors');

// Verify admin access
const verifyAdmin = catchAsync(async (req, res) => {
  const [rows] = await db.query(
    'SELECT role, is_active FROM users WHERE id = ?',
    [req.user.id]
  );

  const user = rows[0];
  if (!user || !user.is_active) {
    throw new ApiError('User not found or inactive', 403);
  }

  if (user.role !== 'admin') {
    throw new ApiError('Admin access required', 403);
  }

  res.json({
    success: true,
    message: 'Admin access verified',
    data: { isAdmin: true }
  });
});

module.exports = {
  verifyAdmin
};
