// Availability Service - Room booking logic
// Note: This imports pool from server.js which must be loaded first

let pool;
try {
    // Try to get pool from server.js scope if available
    const serverModule = require('../server.js');
    pool = serverModule.pool;
} catch (e) {
    // Fallback: create new pool
    const { Pool } = require('pg');
    pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hotel_booking'
    });
}

// Check if room is available for given dates
async function isRoomAvailable(roomId, checkIn, checkOut) {
    if (!roomId || !checkIn || !checkOut) {
        return false;
    }
    
    const query = `
        SELECT 1 FROM bookings 
        WHERE room_id = $1 
          AND booking_status != 'cancelled'
          AND booking_status != 'checked_out'
          AND check_in_date < $3 
          AND check_out_date > $2 
        LIMIT 1
    `;
    
    try {
        const result = await pool.query(query, [roomId, checkIn, checkOut]);
        return result.rowCount === 0;
    } catch (error) {
        console.error('Error checking availability:', error);
        return true; // Allow on error
    }
}

// Calculate total price for booking
async function calculateTotalPrice(roomId, checkIn, checkOut) {
    try {
        const roomResult = await pool.query('SELECT price FROM rooms WHERE id = $1', [roomId]);
        if (roomResult.rows.length === 0) return 0;
        
        const pricePerNight = parseFloat(roomResult.rows[0].price) || 0;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        
        return pricePerNight * days;
    } catch (error) {
        console.error('Error calculating price:', error);
        return 0;
    }
}

module.exports = { isRoomAvailable, calculateTotalPrice, pool };
