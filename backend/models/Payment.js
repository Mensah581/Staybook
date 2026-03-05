const pool = require('../config/db');

class Payment {
  // Create a new payment
  static async create(paymentData) {
    const { booking_id, amount, payment_method, status, transaction_id } = paymentData;
    
    const result = await pool.query(
      `INSERT INTO payments (booking_id, amount, payment_method, status, transaction_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [booking_id, amount, payment_method, status, transaction_id]
    );
    
    return result.rows[0];
  }

  // Get all payments
  static async getAll(filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT p.*, 
             b.id as booking_id,
             c.full_name as customer_name, c.email as customer_email
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND p.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }

    if (filters.payment_method) {
      query += ` AND p.payment_method = $${paramCount}`;
      values.push(filters.payment_method);
      paramCount++;
    }

    if (filters.from_date) {
      query += ` AND DATE(p.created_at) >= $${paramCount}`;
      values.push(filters.from_date);
      paramCount++;
    }

    if (filters.to_date) {
      query += ` AND DATE(p.created_at) <= $${paramCount}`;
      values.push(filters.to_date);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get payment by ID
  static async getById(id) {
    const result = await pool.query(
      `SELECT p.*, 
              b.id as booking_id, b.total_amount as booking_amount,
              c.full_name as customer_name, c.email as customer_email
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Update payment
  static async update(id, paymentData) {
    const { status, transaction_id } = paymentData;
    
    const result = await pool.query(
      `UPDATE payments 
       SET status = COALESCE($1, status),
           transaction_id = COALESCE($2, transaction_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, transaction_id, id]
    );
    
    return result.rows[0];
  }

  // Get payment by transaction ID
  static async getByTransactionId(transactionId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE transaction_id = $1',
      [transactionId]
    );
    return result.rows[0];
  }

  // Get payment statistics
  static async getStats() {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_revenue,
        COUNT(DISTINCT CASE WHEN status = 'completed' THEN payment_method END) as payment_methods
       FROM payments`
    );
    return result.rows[0];
  }

  // Get revenue by date range
  static async getRevenueByDateRange(fromDate, toDate) {
    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as daily_revenue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as transactions
       FROM payments
       WHERE created_at >= $1 AND created_at <= $2
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [fromDate, toDate]
    );
    return result.rows;
  }

  // Get payment methods summary
  static async getPaymentMethodsSummary() {
    const result = await pool.query(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount
       FROM payments
       WHERE status = 'completed'
       GROUP BY payment_method
       ORDER BY total_amount DESC`
    );
    return result.rows;
  }

  // Refund payment
  static async refund(id) {
    const result = await pool.query(
      `UPDATE payments 
       SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Payment;
