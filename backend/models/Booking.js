const pool = require('../config/db');

class Booking {
  // Create a new booking
  static async create(bookingData) {
    const { customer_id, room_id, check_in_date, check_out_date, number_of_guests, total_amount, special_requests } = bookingData;
    
    const result = await pool.query(
      `INSERT INTO bookings (customer_id, room_id, check_in_date, check_out_date, number_of_guests, total_amount, special_requests, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [customer_id, room_id, check_in_date, check_out_date, number_of_guests, total_amount, special_requests]
    );
    
    return result.rows[0];
  }

  // Get all bookings
  static async getAll(filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT b.*, 
             r.title as room_title, r.price as room_price,
             c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM bookings b
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND b.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.room_id) {
      query += ` AND b.room_id = $${paramCount}`;
      values.push(filters.room_id);
      paramCount++;
    }

    if (filters.customer_id) {
      query += ` AND b.customer_id = $${paramCount}`;
      values.push(filters.customer_id);
      paramCount++;
    }

    if (filters.from_date) {
      query += ` AND b.check_in_date >= $${paramCount}`;
      values.push(filters.from_date);
      paramCount++;
    }

    if (filters.to_date) {
      query += ` AND b.check_out_date <= $${paramCount}`;
      values.push(filters.to_date);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get booking by ID
  static async getById(id) {
    const result = await pool.query(
      `SELECT b.*, 
              r.title as room_title, r.price as room_price, r.bedrooms, r.bathrooms, r.max_guests,
              c.full_name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Update booking
  static async update(id, bookingData) {
    const { status, payment_status, payment_method, transaction_id, special_requests } = bookingData;
    
    const result = await pool.query(
      `UPDATE bookings 
       SET status = COALESCE($1, status),
           payment_status = COALESCE($2, payment_status),
           payment_method = COALESCE($3, payment_method),
           transaction_id = COALESCE($4, transaction_id),
           special_requests = COALESCE($5, special_requests),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [status, payment_status, payment_method, transaction_id, special_requests, id]
    );
    
    return result.rows[0];
  }

  // Delete booking
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM bookings WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  // Check-in guest
  static async checkIn(id) {
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'checked_in', check_in_time = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  // Check-out guest
  static async checkOut(id) {
    const result = await pool.query(
      `UPDATE bookings 
       SET status = 'checked_out', check_out_time = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  // Get booking statistics
  static async getStats() {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(total_amount) as total_revenue
       FROM bookings`
    );
    return result.rows[0];
  }

  // Get today's check-ins
  static async getTodaysCheckIns() {
    const result = await pool.query(
      `SELECT b.*, 
              r.title as room_title,
              c.full_name as customer_name, c.phone as customer_phone
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE DATE(b.check_in_date) = CURRENT_DATE
       AND b.status NOT IN ('cancelled')
       ORDER BY b.created_at`
    );
    return result.rows;
  }

  // Get today's check-outs
  static async getTodaysCheckOuts() {
    const result = await pool.query(
      `SELECT b.*, 
              r.title as room_title,
              c.full_name as customer_name, c.phone as customer_phone
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE DATE(b.check_out_date) = CURRENT_DATE
       AND b.status NOT IN ('cancelled')
       ORDER BY b.created_at`
    );
    return result.rows;
  }

  // Get occupancy rate
  static async getOccupancyRate(timeframe = 30) {
    const result = await pool.query(
      `SELECT 
        ROUND(COUNT(DISTINCT CASE WHEN check_in_date <= CURRENT_DATE AND check_out_date > CURRENT_DATE THEN room_id END) * 100.0 / 
              (SELECT COUNT(*) FROM rooms), 2) as occupancy_rate
       FROM bookings
       WHERE status NOT IN ('cancelled')`
    );
    return result.rows[0];
  }
}

module.exports = Booking;
