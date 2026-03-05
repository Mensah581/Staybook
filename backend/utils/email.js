const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

// Send booking confirmation email
const sendBookingConfirmation = async (booking, room, customer) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER || 'bookings@hotel.com',
    to: customer.email,
    subject: `Booking Confirmation - ${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">Booking Confirmed!</h1>
          <p style="margin: 10px 0 0;">Hotel Booking System</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${customer.full_name},</h2>
          
          <p>Thank you for your booking! Your reservation has been confirmed.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Room:</strong> ${room.title}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.check_in_date).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.check_out_date).toLocaleDateString()}</p>
            <p><strong>Total Price:</strong> $${booking.total_amount}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Confirmed</span></p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Guest Information</h3>
            <p><strong>Guest Name:</strong> ${customer.full_name}</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phone}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">Check-in Instructions</h4>
            <p style="margin-bottom: 0;">Check-in time: 2:00 PM</p>
            <p style="margin-bottom: 0;">Check-out time: 12:00 PM</p>
            <p style="margin: 10px 0 0;">Please bring a valid ID and credit card for incidentals.</p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">&copy; 2024 Hotel Booking System. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('Booking confirmation email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Send payment confirmation email
const sendPaymentConfirmation = async (payment, booking, customer) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER || 'bookings@hotel.com',
    to: customer.email,
    subject: `Payment Confirmation - ${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">Payment Received!</h1>
          <p style="margin: 10px 0 0;">Hotel Booking System</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Payment Successfully Processed</h2>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">Payment Details</h3>
            <p><strong>Transaction ID:</strong> ${payment.transaction_id}</p>
            <p><strong>Amount:</strong> $${payment.amount}</p>
            <p><strong>Payment Method:</strong> ${payment.payment_method}</p>
            <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Completed</span></p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Booking Reference</h3>
            <p><strong>Booking ID:</strong> ${booking.id}</p>
            <p><strong>Check-in:</strong> ${new Date(booking.check_in_date).toLocaleDateString()}</p>
            <p><strong>Check-out:</strong> ${new Date(booking.check_out_date).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">&copy; 2024 Hotel Booking System. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Send check-in reminder email
const sendCheckInReminder = async (booking, room, customer) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_USER || 'bookings@hotel.com',
    to: customer.email,
    subject: `Check-in Reminder - ${booking.id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0;">Your Check-in is Today!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Dear ${customer.full_name},</h2>
          
          <p>Welcome! Your check-in is scheduled for today at 2:00 PM.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Room Information</h3>
            <p><strong>Room:</strong> ${room.title}</p>
            <p><strong>Description:</strong> ${room.description}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">Important Notes</h3>
            <ul>
              <li>Please bring a valid ID</li>
              <li>Credit card required for incidentals</li>
              <li>Parking is available</li>
              <li>24-hour room service available</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">&copy; 2024 Hotel Booking System. All rights reserved.</p>
        </div>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('Check-in reminder email sent to:', customer.email);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

module.exports = {
  sendBookingConfirmation,
  sendPaymentConfirmation,
  sendCheckInReminder
};
