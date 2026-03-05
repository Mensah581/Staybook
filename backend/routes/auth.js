const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Authenticated routes
router.get('/me', isAuthenticated, authController.getCurrentUser);
router.put('/me', isAuthenticated, authController.updateUser);
router.post('/change-password', isAuthenticated, authController.changePassword);
router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;
