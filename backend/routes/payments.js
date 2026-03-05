const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticated, isManagerOrAdmin } = require('../middleware/auth');

// Public routes
router.post('/', paymentController.createPayment);

// Authenticated routes
router.get('/', isAuthenticated, paymentController.getAllPayments);
router.get('/stats', isAuthenticated, isManagerOrAdmin, paymentController.getPaymentStats);
router.get('/report', isAuthenticated, isManagerOrAdmin, paymentController.getRevenueReport);
router.get('/methods/summary', isAuthenticated, isManagerOrAdmin, paymentController.getPaymentMethodsSummary);
router.get('/:id', isAuthenticated, paymentController.getPaymentById);

// Manager operations
router.put('/:id', isAuthenticated, isManagerOrAdmin, paymentController.updatePayment);
router.post('/:id/process', isAuthenticated, isManagerOrAdmin, paymentController.processPayment);
router.post('/:id/refund', isAuthenticated, isManagerOrAdmin, paymentController.refundPayment);

module.exports = router;
