const pool = require('../config/db');

class Room {
  // Create a new room
  static async create(roomData) {
    const { title, description, price, bedrooms, bathrooms, max_guests, amenities, status, location } = roomData;
    
    const result = await pool.query(
      `INSERT INTO rooms (title, description, price, bedrooms, bathrooms, max_guests, amenities, status, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, description, price, bedrooms, bathrooms, max_guests, amenities, status, location, created_at`,
      [title, description, price, bedrooms, bathrooms, max_guests, JSON.stringify(amenities || []), status, location]
    );
    
    return result.rows[0];
  }

  // Get all rooms
  static async getAll(filters = {}) {
    let query = 'SELECT * FROM rooms WHERE 1=1';
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.location) {
      query += ` AND location ILIKE $${paramCount}`;
      values.push(`%${filters.location}%`);
      paramCount++;
    }

    if (filters.max_price) {
      query += ` AND price <= $${paramCount}`;
      values.push(filters.max_price);
      paramCount++;
    }

    if (filters.min_price) {
      query += ` AND price >= $${paramCount}`;
      values.push(filters.min_price);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get single room by ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM rooms WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Update room
  static async update(id, roomData) {
    const { title, description, price, bedrooms, bathrooms, max_guests, amenities, status, location } = roomData;
    
    const result = await pool.query(
      `UPDATE rooms 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           bedrooms = COALESCE($4, bedrooms),
           bathrooms = COALESCE($5, bathrooms),
           max_guests = COALESCE($6, max_guests),
           amenities = COALESCE($7, amenities),
           status = COALESCE($8, status),
           location = COALESCE($9, location),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [title, description, price, bedrooms, bathrooms, max_guests, amenities ? JSON.stringify(amenities) : null, status, location, id]
    );
    
    return result.rows[0];
  }

  // Delete room
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM rooms WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  // Get room availability for date range
  static async getAvailability(roomId, checkInDate, checkOutDate) {
    const result = await pool.query(
      `SELECT COUNT(*) as bookings FROM bookings
       WHERE room_id = $1 
       AND status NOT IN ('cancelled')
       AND (
         (check_in_date < $3 AND check_out_date > $2)
       )`,
      [roomId, checkInDate, checkOutDate]
    );
    
    return parseInt(result.rows[0].bookings) === 0;
  }

  // Get available rooms for date range
  static async getAvailableRooms(checkInDate, checkOutDate, maxGuests = null) {
    let query = `
      SELECT r.* FROM rooms r
      WHERE r.status = 'available'
      AND r.id NOT IN (
        SELECT DISTINCT room_id FROM bookings
        WHERE status NOT IN ('cancelled')
        AND (
          (check_in_date < $2 AND check_out_date > $1)
        )
      )
    `;
    
    const values = [checkInDate, checkOutDate];
    
    if (maxGuests) {
      query += ` AND r.max_guests >= $3`;
      values.push(maxGuests);
    }
    
    query += ' ORDER BY r.price ASC';
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Update room status
  static async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE rooms SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  }

  // Get occupancy stats
  static async getOccupancyStats() {
    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT id) as total_rooms,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
       FROM rooms`
    );
    return result.rows[0];
  }
}

module.exports = Room;
