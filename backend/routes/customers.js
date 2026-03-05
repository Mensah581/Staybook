const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isAuthenticated } = require('../middleware/auth');

// Customer routes
router.post('/', customerController.createCustomer);
router.get('/', isAuthenticated, customerController.getAllCustomers);
router.get('/:id', isAuthenticated, customerController.getCustomerById);
router.put('/:id', isAuthenticated, customerController.updateCustomer);
router.delete('/:id', isAuthenticated, customerController.deleteCustomer);
router.get('/:id/bookings', isAuthenticated, customerController.getBookingHistory);

module.exports = router;
