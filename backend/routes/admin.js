const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Admin dashboard
router.get('/stats', isAuthenticated, isAdmin, adminController.getDashboardStats);
router.get('/analytics/revenue', isAuthenticated, isAdmin, adminController.getRevenueAnalytics);
router.get('/analytics/occupancy', isAuthenticated, isAdmin, adminController.getOccupancyAnalytics);

// User management
router.get('/users', isAuthenticated, isAdmin, adminController.getAllUsers);
router.get('/users/role/:role', isAuthenticated, isAdmin, adminController.getUsersByRole);
router.post('/users', isAuthenticated, isAdmin, adminController.createUser);
router.put('/users/:id', isAuthenticated, isAdmin, adminController.updateUser);
router.delete('/users/:id', isAuthenticated, isAdmin, adminController.deleteUser);

module.exports = router;
