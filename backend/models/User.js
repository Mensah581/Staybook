const pool = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    const { username, email, password, full_name, role = 'user' } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, email, password, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name, role, created_at`,
      [username, email, hashedPassword, full_name, role]
    );
    
    return result.rows[0];
  }

  // Get all users
  static async getAll(limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  // Get user by ID
  static async getById(id) {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, created_at, updated_at 
       FROM users 
       WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  // Get user by username
  static async getByUsername(username) {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, created_at, updated_at 
       FROM users 
       WHERE username = $1`,
      [username]
    );
    return result.rows[0];
  }

  // Get user by email
  static async getByEmail(email) {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, created_at, updated_at 
       FROM users 
       WHERE email = $1`,
      [email]
    );
    return result.rows[0];
  }

  // Get user with password (for login)
  static async getByUsernameWithPassword(username) {
    const result = await pool.query(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0];
  }

  // Update user
  static async update(id, userData) {
    const { email, full_name, role } = userData;
    
    const result = await pool.query(
      `UPDATE users 
       SET email = COALESCE($1, email),
           full_name = COALESCE($2, full_name),
           role = COALESCE($3, role),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, username, email, full_name, role, created_at, updated_at`,
      [email, full_name, role, id]
    );
    
    return result.rows[0];
  }

  // Change password
  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      `UPDATE users 
       SET password = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, email, full_name, role, created_at, updated_at`,
      [hashedPassword, id]
    );
    
    return result.rows[0];
  }

  // Delete user
  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Get users by role
  static async getByRole(role) {
    const result = await pool.query(
      `SELECT id, username, email, full_name, role, created_at 
       FROM users 
       WHERE role = $1
       ORDER BY created_at DESC`,
      [role]
    );
    return result.rows;
  }
}

module.exports = User;
