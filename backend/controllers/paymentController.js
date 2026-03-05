const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// Get all payments
const getAllPayments = async (req, res) => {
  try {
    const { status, payment_method, from_date, to_date, limit = 50, offset = 0 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (payment_method) filters.payment_method = payment_method;
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    
    const payments = await Payment.getAll(filters, parseInt(limit), parseInt(offset));
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.getById(id);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create payment
const createPayment = async (req, res) => {
  try {
    const { booking_id, amount, payment_method, status = 'pending' } = req.body;
    
    if (!booking_id || !amount || !payment_method) {
      return res.status(400).json({ success: false, error: 'Booking ID, amount, and payment method are required' });
    }
    
    // Verify booking exists
    const booking = await Booking.getById(parseInt(booking_id));
    if (!booking) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }
    
    const paymentData = {
      booking_id: parseInt(booking_id),
      amount: parseFloat(amount),
      payment_method,
      status,
      transaction_id: `TXN_${Date.now()}`
    };
    
    const payment = await Payment.create(paymentData);
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const payment = await Payment.update(id, { status });
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    // Update booking payment status
    if (status === 'completed') {
      await Booking.update(payment.booking_id, { payment_status: 'paid', status: 'confirmed' });
    }
    
    res.json({ success: true, data: payment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Process payment (simulate payment gateway)
const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { card_number, expiry, cvv } = req.body;
    
    // Validate card details (basic validation)
    if (!card_number || !expiry || !cvv) {
      return res.status(400).json({ success: false, error: 'Card details are required' });
    }
    
    // Simulate payment processing
    const payment = await Payment.update(id, { status: 'completed' });
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    // Update booking
    await Booking.update(payment.booking_id, { payment_status: 'paid', status: 'confirmed' });
    
    res.json({ success: true, message: 'Payment processed successfully', data: payment });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Refund payment
const refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.refund(id);
    
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }
    
    // Update booking
    await Booking.update(payment.booking_id, { payment_status: 'refunded', status: 'cancelled' });
    
    res.json({ success: true, message: 'Payment refunded successfully', data: payment });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment statistics
const getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get revenue report
const getRevenueReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    
    if (!from_date || !to_date) {
      return res.status(400).json({ success: false, error: 'From date and to date are required' });
    }
    
    const revenue = await Payment.getRevenueByDateRange(from_date, to_date);
    res.json({ success: true, data: revenue });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get payment methods summary
const getPaymentMethodsSummary = async (req, res) => {
  try {
    const methods = await Payment.getPaymentMethodsSummary();
    res.json({ success: true, data: methods });
  } catch (error) {
    console.error('Error fetching payment methods summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  processPayment,
  refundPayment,
  getPaymentStats,
  getRevenueReport,
  getPaymentMethodsSummary
};
