// Email Service - Send booking confirmation emails
const nodemailer = require('nodemailer');

// Create transporter (configure with your email provider)
// For Gmail, use: smtp.gmail.com
// For Outlook, use: smtp.office365.com
// For custom SMTP, use your provider's settings
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

// Get hotel settings for email template
async function getHotelSettings() {
    try {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        return result.rows[0] || {
            hotel_name: 'Grand Horizon Suites',
            hotel_email: 'info@hotel.com',
            hotel_phone: '+1234567890',
            hotel_address: '123 Hotel Street, City, Country'
        };
    } catch (error) {
        console.error('Error fetching hotel settings:', error);
        return {
            hotel_name: 'Grand Horizon Suites',
            hotel_email: 'info@hotel.com',
            hotel_phone: '+1234567890',
            hotel_address: '123 Hotel Street, City, Country'
        };
    }
}

// Send booking confirmation email
async function sendBookingConfirmation(booking, roomDetails) {
    const settings = await getHotelSettings();
    
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"${settings.hotel_name}" <${settings.hotel_email}>`,
        to: booking.email,
        subject: `Booking Confirmation - ${settings.hotel_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">${settings.hotel_name}</h1>
                    <p style="color: white; margin: 10px 0 0;">Booking Confirmation</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">Thank you for your booking!</h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #667eea; margin-top: 0;">Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                        <p><strong>Room:</strong> ${roomDetails?.title || 'Standard Room'}</p>
                        <p><strong>Check-in Date:</strong> ${new Date(booking.check_in_date).toLocaleDateString()}</p>
                        <p><strong>Check-out Date:</strong> ${new Date(booking.check_out_date).toLocaleDateString()}</p>
                        <p><strong>Total Price:</strong> $${booking.total_price || '0'}</p>
                        <p><strong>Status:</strong> <span style="color: #28a745;">Reserved</span></p>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #667eea; margin-top: 0;">Guest Information</h3>
                        <p><strong>Name:</strong> ${booking.full_name}</p>
                        <p><strong>Email:</strong> ${booking.email}</p>
                        <p><strong>Phone:</strong> ${booking.phone}</p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #856404;">Check-in Instructions</h4>
                        <p style="margin-bottom: 0;">Check-in time: ${settings.checkin_time || '2:00 PM'}</p>
                        <p style="margin-bottom: 0;">Check-out time: ${settings.checkout_time || '12:00 PM'}</p>
                    </div>
                    
                    <div style="margin-top: 30px;">
                        <h4 style="color: #333;">Hotel Contact</h4>
                        <p style="margin: 5px 0;">📍 ${settings.hotel_address}</p>
                        <p style="margin: 5px 0;">📞 ${settings.hotel_phone}</p>
                        <p style="margin: 5px 0;">✉️ ${settings.hotel_email}</p>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${settings.hotel_name}. All rights reserved.</p>
                </div>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Booking confirmation email sent to ${booking.email}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Send booking cancellation email
async function sendCancellationEmail(booking, roomDetails) {
    const settings = await getHotelSettings();
    
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"${settings.hotel_name}" <${settings.hotel_email}>`,
        to: booking.email,
        subject: `Booking Cancelled - ${settings.hotel_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc3545; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">${settings.hotel_name}</h1>
                    <p style="color: white; margin: 10px 0 0;">Booking Cancelled</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">Your booking has been cancelled</h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #dc3545; margin-top: 0;">Cancelled Booking Details</h3>
                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                        <p><strong>Room:</strong> ${roomDetails?.title || 'Standard Room'}</p>
                        <p><strong>Check-in Date:</strong> ${new Date(booking.check_in_date).toLocaleDateString()}</p>
                        <p><strong>Check-out Date:</strong> ${new Date(booking.check_out_date).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> <span style="color: #dc3545;">Cancelled</span></p>
                    </div>
                    
                    <p>We hope to welcome you another time. If you have any questions, please contact us.</p>
                    
                    <div style="margin-top: 30px;">
                        <h4 style="color: #333;">Hotel Contact</h4>
                        <p style="margin: 5px 0;">📍 ${settings.hotel_address}</p>
                        <p style="margin: 5px 0;">📞 ${settings.hotel_phone}</p>
                        <p style="margin: 5px 0;">✉️ ${settings.hotel_email}</p>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${settings.hotel_name}. All rights reserved.</p>
                </div>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Cancellation email sent to ${booking.email}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Send check-in confirmation email
async function sendCheckInEmail(booking, roomDetails) {
    const settings = await getHotelSettings();
    
    const transporter = createTransporter();
    
    const mailOptions = {
        from: `"${settings.hotel_name}" <${settings.hotel_email}>`,
        to: booking.email,
        subject: `Check-in Confirmed - ${settings.hotel_name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #28a745; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">${settings.hotel_name}</h1>
                    <p style="color: white; margin: 10px 0 0;">Check-in Confirmed</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9;">
                    <h2 style="color: #333;">Welcome! You have been checked in.</h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #28a745; margin-top: 0;">Stay Details</h3>
                        <p><strong>Booking ID:</strong> #${booking.id}</p>
                        <p><strong>Room:</strong> ${roomDetails?.title || 'Standard Room'}</p>
                        <p><strong>Check-in Date:</strong> ${new Date(booking.check_in_date).toLocaleDateString()}</p>
                        <p><strong>Check-out Date:</strong> ${new Date(booking.check_out_date).toLocaleDateString()}</p>
                        <p><strong>Status:</strong> <span style="color: #28a745;">Checked In</span></p>
                    </div>
                    
                    <p>We hope you enjoy your stay! If you need anything, please contact our front desk.</p>
                    
                    <div style="margin-top: 30px;">
                        <h4 style="color: #333;">Hotel Contact</h4>
                        <p style="margin: 5px 0;">📍 ${settings.hotel_address}</p>
                        <p style="margin: 5px 0;">📞 ${settings.hotel_phone}</p>
                        <p style="margin: 5px 0;">✉️ ${settings.hotel_email}</p>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 20px; text-align: center;">
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${settings.hotel_name}. All rights reserved.</p>
                </div>
            </div>
        `
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Check-in email sent to ${booking.email}`);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

module.exports = {
    sendBookingConfirmation,
    sendCancellationEmail,
    sendCheckInEmail
};
