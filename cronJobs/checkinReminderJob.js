// Check-in Reminder Cron Job
// Runs every day at 8 AM

const cron = require('node-cron');
const { send } = require('../services/notificationService');

function startCheckinReminderJob(pool) {
    // Schedule to run every day at 8 AM
    cron.schedule('0 8 * * *', async () => {
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
            
            console.log(`Found ${result.rows.length} bookings for tomorrow`);
            
            for (const booking of result.rows) {
                const result = await send(pool, 'checkin_reminder', booking);
                if (result.success) {
                    console.log(`Reminder sent to ${booking.email}`);
                } else {
                    console.log(`Failed to send reminder to ${booking.email}: ${result.reason}`);
                }
            }
            
            console.log(`Processed ${result.rows.length} check-in reminders`);
        } catch (error) {
            console.error('Error in check-in reminder cron job:', error.message);
        }
    });
    
    console.log('Check-in reminder cron job scheduled (runs daily at 8 AM)');
}

module.exports = { startCheckinReminderJob };
