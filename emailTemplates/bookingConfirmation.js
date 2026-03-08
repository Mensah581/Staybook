// Booking Confirmation Email Template

function bookingConfirmationTemplate(guestName, roomTitle, checkInDate, price) {
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
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Booking Confirmed ✓</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px;">
                            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear <strong style="color: #667eea;">${guestName}</strong>,
                            </p>
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for your booking! Your reservation has been confirmed. We look forward to welcoming you!
                            </p>
                            
                            <!-- Booking Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 20px;">
                                        <h3 style="color: #333333; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Booking Details</h3>
                                        
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px;">Room</td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold; text-align: right;">${roomTitle}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px; border-top: 1px solid #e9ecef;">Check-in Date</td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold; text-align: right; border-top: 1px solid #e9ecef;">${checkIn}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px; border-top: 1px solid #e9ecef;">Check-in Time</td>
                                                <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold; text-align: right; border-top: 1px solid #e9ecef;">2:00 PM</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #666666; font-size: 14px; border-top: 1px solid #e9ecef;">Price per Night</td>
                                                <td style="padding: 8px 0; color: #28a745; font-size: 14px; font-weight: bold; text-align: right; border-top: 1px solid #e9ecef;">$${price}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                If you have any questions, please don't hesitate to contact us.
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

module.exports = { bookingConfirmationTemplate };
