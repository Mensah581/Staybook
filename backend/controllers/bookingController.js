const Booking = require('../models/Booking');
const Room = require('../models/Room');

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, room_id, customer_id, from_date, to_date, limit = 50, offset = 0 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (room_id) filters.room_id = parseInt(room_id);
    if (customer_id) filters.customer_id = parseInt(customer_id);
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    
    const bookings = await Booking.getAll(filters, parseInt(limit), parseInt(offset));
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.getById(id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create booking
const createBooking = async (req, res) => {
  try {
    const { customer_id, room_id, check_in_date, check_out_date, number_of_guests, special_requests } = req.body;
    
    if (!customer_id || !room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ success: false, error: 'Customer ID, room ID, check-in and check-out dates are required' });
    }
    
    // Check room availability
    const isAvailable = await Room.getAvailability(room_id, check_in_date, check_out_date);
    if (!isAvailable) {
      return res.status(400).json({ success: false, error: 'Room is not available for the selected dates' });
    }
    
    // Get room details for price calculation
    const room = await Room.getById(room_id);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    
    // Calculate total amount
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const totalAmount = room.price * numberOfNights;
    
    const bookingData = {
      customer_id: parseInt(customer_id),
      room_id: parseInt(room_id),
      check_in_date,
      check_out_date,
      number_of_guests: parseInt(number_of_guests) || 1,
      total_amount: totalAmount,
      special_requests: special_requests || ''
    };
    
    const booking = await Booking.create(bookingData);
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update booking
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.update(id, req.body);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete booking
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.delete(id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check-in guest
const checkInGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.checkIn(id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Update room status to occupied
    await Room.updateStatus(booking.room_id, 'occupied');
    
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error checking in guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check-out guest
const checkOutGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.checkOut(id);
    
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    // Update room status to available
    await Room.updateStatus(booking.room_id, 'available');
    
    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Error checking out guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get booking statistics
const getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get today's check-ins
const getTodaysCheckIns = async (req, res) => {
  try {
    const checkIns = await Booking.getTodaysCheckIns();
    res.json({ success: true, data: checkIns });
  } catch (error) {
    console.error('Error fetching today\'s check-ins:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get today's check-outs
const getTodaysCheckOuts = async (req, res) => {
  try {
    const checkOuts = await Booking.getTodaysCheckOuts();
    res.json({ success: true, data: checkOuts });
  } catch (error) {
    console.error('Error fetching today\'s check-outs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get occupancy rate
const getOccupancyRate = async (req, res) => {
  try {
    const occupancy = await Booking.getOccupancyRate();
    res.json({ success: true, data: occupancy });
  } catch (error) {
    console.error('Error fetching occupancy rate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  checkInGuest,
  checkOutGuest,
  getBookingStats,
  getTodaysCheckIns,
  getTodaysCheckOuts,
  getOccupancyRate
};
