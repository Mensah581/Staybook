const pool = require('../config/db');

class Customer {
  // Create a new customer
  static async create(customerData) {
    const { full_name, email, phone, address, city, country } = customerData;
    
    const result = await pool.query(
      `INSERT INTO customers (full_name, email, phone, address, city, country)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [full_name, email, phone, address, city, country]
    );
    
    return result.rows[0];
  }

  // Get all customers
  static async getAll(limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT * FROM customers ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // Get customer by ID
  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Get customer by email
  static async getByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  // Update customer
  static async update(id, customerData) {
    const { full_name, email, phone, address, city, country } = customerData;
    
    const result = await pool.query(
      `UPDATE customers 
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           city = COALESCE($5, city),
           country = COALESCE($6, country),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [full_name, email, phone, address, city, country, id]
    );
    
    return result.rows[0];
  }

  // Delete customer
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  // Get customer booking history
  static async getBookingHistory(customerId) {
    const result = await pool.query(
      `SELECT b.*, r.title as room_title, r.price as room_price
       FROM bookings b
       LEFT JOIN rooms r ON b.room_id = r.id
       WHERE b.customer_id = $1
       ORDER BY b.created_at DESC`,
      [customerId]
    );
    return result.rows;
  }

  // Get total bookings count
  static async getTotalCount() {
    const result = await pool.query('SELECT COUNT(*) as count FROM customers');
    return parseInt(result.rows[0].count);
  }
}

module.exports = Customer;
