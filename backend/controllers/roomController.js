const Room = require('../models/Room');

// Get all rooms
const getAllRooms = async (req, res) => {
  try {
    const { status, location, min_price, max_price } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (location) filters.location = location;
    if (min_price) filters.min_price = parseFloat(min_price);
    if (max_price) filters.max_price = parseFloat(max_price);
    
    const rooms = await Room.getAll(filters);
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get room by ID
const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.getById(id);
    
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get available rooms
const getAvailableRooms = async (req, res) => {
  try {
    const { check_in_date, check_out_date, max_guests } = req.query;
    
    if (!check_in_date || !check_out_date) {
      return res.status(400).json({ success: false, error: 'Check-in and check-out dates are required' });
    }
    
    const rooms = await Room.getAvailableRooms(check_in_date, check_out_date, max_guests ? parseInt(max_guests) : null);
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create room (admin only)
const createRoom = async (req, res) => {
  try {
    const { title, description, price, bedrooms, bathrooms, max_guests, amenities, status, location } = req.body;
    
    if (!title || !description || !price) {
      return res.status(400).json({ success: false, error: 'Title, description, and price are required' });
    }
    
    const roomData = {
      title,
      description,
      price: parseFloat(price),
      bedrooms: bedrooms || 1,
      bathrooms: bathrooms || 1,
      max_guests: max_guests || 2,
      amenities: amenities || [],
      status: status || 'available',
      location: location || ''
    };
    
    const room = await Room.create(roomData);
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update room (admin only)
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.update(id, req.body);
    
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete room (admin only)
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.delete(id);
    
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update room status
const updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    
    const room = await Room.updateStatus(id, status);
    
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    res.json({ success: true, data: room });
  } catch (error) {
    console.error('Error updating room status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get occupancy stats
const getOccupancyStats = async (req, res) => {
  try {
    const stats = await Room.getOccupancyStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching occupancy stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  getOccupancyStats
};
