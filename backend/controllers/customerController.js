const Customer = require('../models/Customer');

// Get all customers
const getAllCustomers = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const customers = await Customer.getAll(parseInt(limit), parseInt(offset));
    const total = await Customer.getTotalCount();
    
    res.json({ success: true, data: customers, total });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get customer by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.getById(id);
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create customer
const createCustomer = async (req, res) => {
  try {
    const { full_name, email, phone, address, city, country } = req.body;
    
    if (!full_name || !email || !phone) {
      return res.status(400).json({ success: false, error: 'Name, email, and phone are required' });
    }
    
    // Check if customer already exists
    const existingCustomer = await Customer.getByEmail(email);
    if (existingCustomer) {
      return res.status(400).json({ success: false, error: 'Customer with this email already exists' });
    }
    
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.update(id, req.body);
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.delete(id);
    
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get customer booking history
const getBookingHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await Customer.getBookingHistory(id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Error fetching booking history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getBookingHistory
};
