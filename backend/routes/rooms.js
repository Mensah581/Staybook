const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Public routes
router.get('/', roomController.getAllRooms);
router.get('/available', roomController.getAvailableRooms);
router.get('/stats', roomController.getOccupancyStats);
router.get('/:id', roomController.getRoomById);

// Admin routes
router.post('/', isAuthenticated, isAdmin, roomController.createRoom);
router.put('/:id', isAuthenticated, isAdmin, roomController.updateRoom);
router.delete('/:id', isAuthenticated, isAdmin, roomController.deleteRoom);
router.patch('/:id/status', isAuthenticated, isAdmin, roomController.updateRoomStatus);

module.exports = router;
