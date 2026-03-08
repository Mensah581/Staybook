// Email Service for automated guest notifications
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// Email configuration
let transporter = null;

// Initialize transporter if email credentials are provided
function initializeEmailService() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    if (emailUser && emailPass) {
        transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });
        console.log('Email service initialized');
    } else {
        console.log('Email credentials not configured - emails will be logged only');
    }
}

// Send email or log if not configured
async function sendEmail(to, subject, html) {
    const emailUser = process.env.EMAIL_USER || 'hotel@example.com';
    
    const mailOptions = {
        from: `"Hotel Booking" <${emailUser}>`,
        to,
        subject,
        html
    };
    
    if (transporter) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${to}: ${subject}`);
            return true;
        } catch (error) {
            console.error(`Error sending email to ${to}:`, error.message);
            return false;
        }
    } else {
        // Log email content if not configured
        console.log(`[EMAIL MOCK] To: ${to}`);
        console.log(`[EMAIL MOCK] Subject: ${subject}`);
        console.log(`[EMAIL MOCK] Body: ${html.substring(0, 200)}...`);
        return true;
    }
}

// Email Templates
function getBookingConfirmationTemplate(booking, room) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #667eea; color: white; padding: 20px; text-align: center;">
                <h1>Booking Confirmation</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd;">
                <p>Dear <strong>${booking.full_name}</strong>,</p>
                <p>Thank you for your booking! Your reservation has been confirmed.</p>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Booking Details</h3>
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                    <p><strong>Room:</strong> ${room.title}</p>
                    <p><strong>Check-in:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Check-in Time:</strong> ${booking.booking_time || '14:00'}</p>
                    <p><strong>Price:</strong> $${booking.price} per night</p>
                </div>
                
                <p>We look forward to welcoming you!</p>
                
                <p style="color: #666; font-size: 12px;">
                    If you have any questions, please contact us.
                </p>
            </div>
            <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} Hotel Booking System
            </div>
        </div>
    `;
}

function getCheckInReminderTemplate(booking, room) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #48bb78; color: white; padding: 20px; text-align: center;">
                <h1>Check-in Reminder</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd;">
                <p>Dear <strong>${booking.full_name}</strong>,</p>
                <p>This is a friendly reminder about your upcoming stay!</p>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Tomorrow's Check-in</h3>
                    <p><strong>Room:</strong> ${room.title}</p>
                    <p><strong>Check-in Date:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Check-in Time:</strong> ${booking.booking_time || '14:00'}</p>
                </div>
                
                <p>We look forward to seeing you tomorrow!</p>
            </div>
            <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} Hotel Booking System
            </div>
        </div>
    `;
}

function getCheckOutReceiptTemplate(booking, room) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ed8936; color: white; padding: 20px; text-align: center;">
                <h1>Check-out Receipt</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd;">
                <p>Dear <strong>${booking.full_name}</strong>,</p>
                <p>Thank you for staying with us! Here is your receipt.</p>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Stay Summary</h3>
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                    <p><strong>Room:</strong> ${room.title}</p>
                    <p><strong>Check-in:</strong> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                    <p><strong>Check-out:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Total Charged:</strong> <strong>$${booking.price}</strong></p>
                </div>
                
                <p>We hope you enjoyed your stay and will visit us again soon!</p>
                
                <p style="color: #666; font-size: 12px;">
                    Thank you for choosing our hotel.
                </p>
            </div>
            <div style="background: #333; color: white; padding: 10px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} Hotel Booking System
            </div>
        </div>
    `;
}

// Notification Functions
async function sendBookingConfirmation(booking, room) {
    if (!booking.email) {
        console.log('No email address for booking:', booking.id);
        return;
    }
    
    const subject = `Booking Confirmed - Room ${room.title}`;
    const html = getBookingConfirmationTemplate(booking, room);
    
    await sendEmail(booking.email, subject, html);
}

async function sendCheckInReminder(booking, room) {
    if (!booking.email) {
        console.log('No email address for booking:', booking.id);
        return;
    }
    
    const subject = `Reminder: Check-in Tomorrow - Room ${room.title}`;
    const html = getCheckInReminderTemplate(booking, room);
    
    await sendEmail(booking.email, subject, html);
}

async function sendCheckOutReceipt(booking, room) {
    if (!booking.email) {
        console.log('No email address for booking:', booking.id);
        return;
    }
    
    const subject = `Thank You for Staying! - Receipt`;
    const html = getCheckOutReceiptTemplate(booking, room);
    
    await sendEmail(booking.email, subject, html);
}

// Schedule check-in reminders (runs every hour)
function scheduleCheckInReminders(pool) {
    cron.schedule('0 * * * *', async () => {
        console.log('Running check-in reminder cron job...');
        
        try {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            // Get confirmed bookings for tomorrow
            const result = await pool.query(
                `SELECT b.*, r.title as room_title 
                 FROM bookings b 
                 LEFT JOIN rooms r ON b.room_id = r.id
                 WHERE b.booking_date = $1 AND b.status = 'confirmed'`,
                [tomorrowStr]
            );
            
            for (const booking of result.rows) {
                const room = { title: booking.room_title };
                await sendCheckInReminder(booking, room);
            }
            
            console.log(`Sent ${result.rows.length} check-in reminders`);
        } catch (error) {
            console.error('Error in check-in reminder cron:', error);
        }
    });
    
    console.log('Check-in reminder cron scheduled (runs every hour)');
}

module.exports = {
    initializeEmailService,
    sendBookingConfirmation,
    sendCheckInReminder,
    sendCheckOutReceipt,
    scheduleCheckInReminders
};
