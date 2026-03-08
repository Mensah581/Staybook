// Notification Service - External email API integration
const axios = require('axios');

// Email templates
const { bookingConfirmationTemplate } = require('../emailTemplates/bookingConfirmation');
const { checkinReminderTemplate } = require('../emailTemplates/checkinReminder');
const { checkoutReceiptTemplate } = require('../emailTemplates/checkoutReceipt');

async function send(pool, event, booking) {
    try {
        // Fetch hotel email settings
        const settingsResult = await pool.query('SELECT * FROM hotel_settings LIMIT 1');
        const settings = settingsResult.rows[0];

        // If no email service configured, skip silently
        if (!settings || !settings.api_key) {
            console.log('No email service configured - skipping notification');
            return { success: false, reason: 'no_email_service' };
        }

        // Get room info if not included
        let roomTitle = booking.room_title || 'Your Room';
        if (!booking.room_title && booking.room_id) {
            const roomResult = await pool.query('SELECT title FROM rooms WHERE id = $1', [booking.room_id]);
            if (roomResult.rows.length > 0) {
                roomTitle = roomResult.rows[0].title;
            }
        }

        // Select template and subject based on event
        let html, subject;
        switch (event) {
            case 'booking_created':
                html = bookingConfirmationTemplate(
                    booking.full_name,
                    roomTitle,
                    booking.booking_date,
                    booking.price
                );
                subject = `Booking Confirmed - ${settings.hotel_name || 'Hotel'}`;
                break;
            case 'checkin_reminder':
                html = checkinReminderTemplate(
                    booking.full_name,
                    roomTitle,
                    booking.booking_date
                );
                subject = `Check-in Reminder - Tomorrow at ${settings.hotel_name || 'Hotel'}`;
                break;
            case 'booking_checked_out':
                html = checkoutReceiptTemplate(
                    booking.full_name,
                    roomTitle,
                    booking.booking_date,
                    booking.price
                );
                subject = `Thank You! Checkout Receipt - ${settings.hotel_name || 'Hotel'}`;
                break;
            case 'booking_checked_in':
                html = bookingConfirmationTemplate(
                    booking.full_name,
                    roomTitle,
                    booking.booking_date,
                    booking.price
                );
                subject = `Check-in Confirmed - Welcome to ${settings.hotel_name || 'Hotel'}!`;
                break;
            default:
                return { success: false, reason: 'unknown_event' };
        }

        // Send email via external API
        const result = await sendViaExternalAPI(settings, booking.email, subject, html);

        // Log success
        await pool.query(
            'INSERT INTO email_logs (booking_id, recipient, event, status) VALUES ($1, $2, $3, $4)',
            [booking.id, booking.email, event, 'sent']
        );

        console.log(`Email sent: ${event} to ${booking.email}`);
        return { success: true };

    } catch (error) {
        console.error('Email sending error:', error.message);

        // Log failure
        try {
            await pool.query(
                'INSERT INTO email_logs (booking_id, recipient, event, status, error_message) VALUES ($1, $2, $3, $4, $5)',
                [booking.id, booking.email, event, 'failed', error.message]
            );
        } catch (logError) {
            console.error('Failed to log email error:', logError.message);
        }

        return { success: false, error: error.message };
    }
}

// Send email via external service (SendGrid, Mailgun, SES, etc.)
async function sendViaExternalAPI(settings, to, subject, html) {
    const { email_service, api_key, sender_email } = settings;
    const from = sender_email || 'noreply@hotel.com';

    switch (email_service) {
        case 'sendgrid':
            return axios.post(
                'https://api.sendgrid.com/v3/mail/send',
                {
                    personalizations: [{ to: [{ email: to }] }],
                    from: { email: from },
                    subject: subject,
                    content: [{ type: 'text/html', value: html }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${api_key}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

        case 'mailgun':
            return axios.post(
                `https://api.mailgun.net/v3/${settings.domain || 'mg.hotel.com'}/messages`,
                {
                    from: `Hotel <${from}>`,
                    to: to,
                    subject: subject,
                    html: html
                },
                {
                    auth: {
                        username: 'api',
                        password: api_key
                    }
                }
            );

        case 'aws_ses':
            // AWS SES requires AWS SDK - using mock here
            console.log(`[AWS SES MOCK] Sending to: ${to}, Subject: ${subject}`);
            return { data: { messageId: 'mock-message-id' } };

        default:
            // Generic API call - assume it's a REST endpoint
            if (settings.api_url) {
                return axios.post(settings.api_url, {
                    to: to,
                    from: from,
                    subject: subject,
                    html: html
                }, {
                    headers: {
                        'Authorization': `Bearer ${api_key}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
            throw new Error('Unsupported email service');
    }
}

module.exports = { send };
