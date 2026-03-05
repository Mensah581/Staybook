const User = require('../models/User');

// Register user
const register = async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;
    
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ success: false, error: 'Username, email, password, and full name are required' });
    }
    
    // Check if user already exists
    const existingUser = await User.getByUsername(username);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }
    
    const user = await User.create({ username, email, password, full_name, role });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    
    const user = await User.getByUsernameWithPassword(username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, error: 'Error logging out' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Error logging out user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const user = await User.getById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const user = await User.update(req.session.userId, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required' });
    }
    
    const user = await User.getByUsernameWithPassword(req.session.username);
    const isValidPassword = await User.verifyPassword(current_password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    
    const updatedUser = await User.changePassword(req.session.userId, new_password);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  updateUser,
  changePassword
};
