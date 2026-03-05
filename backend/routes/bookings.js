const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { isAuthenticated, isFrontDeskOrAdmin, isManagerOrAdmin } = require('../middleware/auth');

// Public routes
router.post('/', bookingController.createBooking);

// Authenticated routes
router.get('/', isAuthenticated, bookingController.getAllBookings);
router.get('/stats', isAuthenticated, bookingController.getBookingStats);
router.get('/checkins/today', isAuthenticated, isFrontDeskOrAdmin, bookingController.getTodaysCheckIns);
router.get('/checkouts/today', isAuthenticated, isFrontDeskOrAdmin, bookingController.getTodaysCheckOuts);
router.get('/occupancy/rate', isAuthenticated, isManagerOrAdmin, bookingController.getOccupancyRate);
router.get('/:id', isAuthenticated, bookingController.getBookingById);

// Front desk operations
router.put('/:id', isAuthenticated, bookingController.updateBooking);
router.post('/:id/checkin', isAuthenticated, isFrontDeskOrAdmin, bookingController.checkInGuest);
router.post('/:id/checkout', isAuthenticated, isFrontDeskOrAdmin, bookingController.checkOutGuest);

// Admin operations
router.delete('/:id', isAuthenticated, isFrontDeskOrAdmin, bookingController.deleteBooking);

module.exports = router;
