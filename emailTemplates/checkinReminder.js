// Check-in Reminder Email Template

function checkinReminderTemplate(guestName, roomTitle, checkInDate) {
    const checkIn = new Date(checkInDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⏰ Check-in Reminder</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear <strong style="color: #48bb78;">${guestName}</strong>,
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                This is a friendly reminder about your upcoming stay! We can't wait to welcome you tomorrow.
                            </p>
                            
                            <!-- Reminder Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff8e6; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 16px;">Tomorrow's Check-in</h3>
                                        
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;">Room</td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold; text-align: right;">${roomTitle}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px; border-top: 1px solid #e9ecef;">Check-in Date</td>
                                                <td style="padding: 8px 0; color: #d97706; font-size: 14px; font-weight: bold; text-align: right; border-top: 1px solid #e9ecef;">${checkIn}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px; border-top: 1px solid #e9ecef;">Check-in Time</td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold; text-align: right; border-top: 1px solid #e9ecef;">2:00 PM</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                See you soon! 🎉
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #333333; padding: 20px; text-align: center;">
                            <p style="color: #ffffff; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Hotel Booking System</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

module.exports = { checkinReminderTemplate };
