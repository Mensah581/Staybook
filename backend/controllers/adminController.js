const User = require('../models/User');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// Get admin dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [roomStats, bookingStats, paymentStats, occupancyRate] = await Promise.all([
      Room.getOccupancyStats(),
      Booking.getStats(),
      Payment.getStats(),
      Booking.getOccupancyRate()
    ]);
    
    res.json({
      success: true,
      data: {
        rooms: roomStats,
        bookings: bookingStats,
        payments: paymentStats,
        occupancy: occupancyRate
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const users = await User.getAll(parseInt(limit), parseInt(offset));
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get users by role
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const users = await User.getByRole(role);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create user (admin only)
const createUser = async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;
    
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    const user = await User.create({ username, email, password, full_name, role });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update user (admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.update(id, req.body);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.delete(id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    
    const from = from_date || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const to = to_date || new Date().toISOString().split('T')[0];
    
    const [revenue, paymentMethods] = await Promise.all([
      Payment.getRevenueByDateRange(from, to),
      Payment.getPaymentMethodsSummary()
    ]);
    
    res.json({
      success: true,
      data: {
        daily_revenue: revenue,
        payment_methods: paymentMethods
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get occupancy analytics
const getOccupancyAnalytics = async (req, res) => {
  try {
    const occupancy = await Booking.getOccupancyRate();
    const stats = await Room.getOccupancyStats();
    
    res.json({
      success: true,
      data: {
        occupancy_rate: occupancy,
        room_stats: stats
      }
    });
  } catch (error) {
    console.error('Error fetching occupancy analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUsersByRole,
  createUser,
  updateUser,
  deleteUser,
  getRevenueAnalytics,
  getOccupancyAnalytics
};
