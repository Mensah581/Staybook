const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Notification service
const notificationService = require('./services/notificationService');

const app = express();
const PORT = process.env.PORT || 5000;

// Role-based middleware
function authorizeRole(allowedRoles) {
    return (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hotel_booking_secret_key_2024');
            req.user = decoded;
            
            if (!allowedRoles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Access denied' });
            }
            
            next();
        } catch (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
    };
}

// Trust proxy for Render
app.set('trust proxy', 1);

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ===================== SYSTEM STATUS =====================

// Root endpoint - system status
app.get('/', (req, res) => {
    res.json({
        message: "Hotel Booking Backend API Running"
    });
});

// ===================== AUTHENTICATION =====================

// Register endpoint (public - use to create first admin)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }
        
        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const userRole = role || 'frontdesk';
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, userRole]
        );
        
        res.status(201).json({
            message: 'User created successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }
        
        // Find user in database
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        const user = result.rows[0];
        
        // Compare password
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { user_id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'hotel_booking_secret_key_2024',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            role: user.role,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});

// ===================== ROOMS SYSTEM =====================

// Get all rooms (public - for customers)
app.get('/api/rooms', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM rooms ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all rooms (admin, manager, frontdesk)
app.get('/api/admin/rooms', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: error.message });
    }
});

// Room Board - live status view for front desk
app.get('/api/rooms/board', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                rooms.id as room_id,
                rooms.title,
                rooms.price,
                rooms.status,
                bookings.id as booking_id,
                bookings.full_name as current_guest,
                bookings.booking_date as check_out
            FROM rooms
            LEFT JOIN bookings 
                ON rooms.id = bookings.room_id 
                AND bookings.status = 'checked_in'
            ORDER BY rooms.id
        `);
        
        // Format the response
        const board = result.rows.map(row => ({
            room_id: row.room_id,
            title: row.title,
            price: parseFloat(row.price),
            status: row.status,
            booking_id: row.booking_id || null,
            current_guest: row.current_guest || null,
            check_out: row.check_out || null
        }));
        
        res.json(board);
    } catch (error) {
        console.error('Error fetching room board:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single room (public - for customers)
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single room (admin, manager, frontdesk)
app.get('/api/admin/rooms/:id', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check room availability for dates
// Returns bookings if room is booked, empty if available
app.get('/api/rooms/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { check_in, check_out } = req.query;
        
        if (!check_in || !check_out) {
            return res.status(400).json({ error: 'check_in and check_out dates are required' });
        }
        
        // SQL: Find overlapping bookings
        // Room is NOT available if: new_check_in < existing_check_out AND new_check_out > existing_check_in
        const result = await pool.query(`
            SELECT * FROM bookings
            WHERE room_id = $1
              AND status = 'confirmed'
              AND $2 < check_out
              AND $3 > check_in
        `, [id, check_in, check_out]);
        
        // If no rows returned, room is available
        const isAvailable = result.rows.length === 0;
        
        res.json({
            room_id: id,
            check_in,
            check_out,
            is_available: isAvailable,
            conflicting_bookings: result.rows
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create room (admin only)
app.post('/api/rooms', authorizeRole(['admin']), async (req, res) => {
    try {
        const { title, description, price, amenities, status, beds, baths, guests, size, location } = req.body;
        
        if (!title || !price) {
            return res.status(400).json({ error: 'Title and price are required' });
        }
        
        const result = await pool.query(`
            INSERT INTO rooms (title, description, price, amenities, status, beds, baths, guests, size, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [title, description, price, amenities, status || 'available', beds || 1, baths || 1, guests || 2, size || 25, location]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update room (admin only)
app.put('/api/rooms/:id', authorizeRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, amenities, status, beds, baths, guests, size, location } = req.body;
        
        // Validate room status if provided
        const validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid room status. Must be one of: available, occupied, cleaning, maintenance' });
        }
        
        const result = await pool.query(`
            UPDATE rooms 
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                price = COALESCE($3, price),
                amenities = COALESCE($4, amenities),
                status = COALESCE($5, status),
                beds = COALESCE($6, beds),
                baths = COALESCE($7, baths),
                guests = COALESCE($8, guests),
                size = COALESCE($9, size),
                location = COALESCE($10, location)
            WHERE id = $11
            RETURNING *
        `, [title, description, price, amenities, status, beds, baths, guests, size, location, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete room (admin only)
app.delete('/api/rooms/:id', authorizeRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
        
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===================== BOOKINGS (PLACEHOLDER) =====================

// Public booking form - customers can book without login
app.post('/api/book', async (req, res) => {
    try {
        const { room_id, full_name, phone, email, booking_date, booking_time, message } = req.body;
        
        // Validate required fields
        if (!room_id || !full_name || !phone || !email || !booking_date || !booking_time) {
            return res.status(400).json({ 
                message: 'room_id, full_name, phone, email, booking_date, and booking_time are required' 
            });
        }
        
        // Check if room exists and is available
        const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [room_id]);
        
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }
        
        const room = roomResult.rows[0];
        
        if (room.status !== 'available' && room.status !== 'cleaning') {
            return res.status(400).json({ message: 'Room is not available for booking' });
        }
        
        // Check date is not in the past
        const bookingDate = new Date(booking_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (bookingDate < today) {
            return res.status(400).json({ message: 'Booking date cannot be in the past' });
        }
        
        // Check for existing bookings on that date
        const existingBooking = await pool.query(`
            SELECT * FROM bookings 
            WHERE room_id = $1 
              AND booking_date = $2 
              AND status IN ('pending', 'approved')
        `, [room_id, booking_date]);
        
        if (existingBooking.rows.length > 0) {
            return res.status(400).json({ message: 'Room is already booked for this date' });
        }
        
        // Insert booking
        const result = await pool.query(`
            INSERT INTO bookings (room_id, full_name, phone, email, booking_date, booking_time, message, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `, [room_id, full_name, phone, email, booking_date, booking_time, message]);
        
        res.status(201).json({
            message: 'Booking submitted successfully! We will contact you shortly.',
            booking: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create booking (admin, manager, frontdesk)
app.post('/api/bookings', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const { room_id, full_name, phone, email, booking_date, booking_time, status } = req.body;
        
        // Validate required fields
        if (!room_id || !full_name || !phone || !email || !booking_date) {
            return res.status(400).json({ 
                error: 'room_id, full_name, phone, email, and booking_date are required' 
            });
        }
        
        // Check room availability
        const availabilityResult = await pool.query(`
            SELECT * FROM bookings
            WHERE room_id = $1
              AND booking_date = $2
              AND status IN ('pending', 'confirmed', 'checked_in')
        `, [room_id, booking_date]);
        
        // If not available, reject
        if (availabilityResult.rows.length > 0) {
            return res.status(400).json({
                message: "Room not available for selected date",
                conflicting_bookings: availabilityResult.rows
            });
        }
        
        // If available, insert booking
        const result = await pool.query(`
            INSERT INTO bookings (room_id, full_name, phone, email, booking_date, booking_time, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [room_id, full_name, phone, email, booking_date, booking_time, status || 'confirmed']);
        
        // If booking is confirmed immediately, update room status
        const bookingStatus = status || 'confirmed';
        if (bookingStatus === 'confirmed') {
            await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', ['occupied', room_id]);
        }
        
        // Send booking confirmation email (async, don't wait)
        const booking = result.rows[0];
        
        notificationService.send(pool, 'booking_created', booking).catch(err => 
            console.error('Error sending confirmation email:', err)
        );
        
        res.status(201).json({
            message: 'Booking successful',
            booking: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all bookings (admin, manager, frontdesk)
app.get('/api/bookings', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const { room_id, status, date_from, date_to } = req.query;
        let query = `
            SELECT b.*, r.title as room_name
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (room_id) {
            query += ` AND b.room_id = ${paramIndex}`;
            params.push(room_id);
            paramIndex++;
        }
        
        if (status) {
            query += ` AND b.status = ${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (date_from) {
            query += ` AND b.check_in >= ${paramIndex}`;
            params.push(date_from);
            paramIndex++;
        }
        
        if (date_to) {
            query += ` AND b.check_out <= ${paramIndex}`;
            params.push(date_to);
            paramIndex++;
        }
        
        query += ` ORDER BY b.created_at DESC`;
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get booking calendar (admin, manager)
app.get('/api/bookings/calendar', authorizeRole(['admin', 'manager']), async (req, res) => {
    try {
        const { month, year } = req.query;
        
        // Default to current month if not specified
        const now = new Date();
        const targetMonth = month || now.getMonth() + 1;
        const targetYear = year || now.getFullYear();
        
        // Get start and end of month
        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0);
        
        const result = await pool.query(`
            SELECT 
                b.id as booking_id,
                b.room_id,
                r.title as room_title,
                b.full_name as guest_name,
                b.booking_date as check_in,
                b.booking_date as check_out,
                b.status,
                b.price
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            WHERE b.status IN ('pending', 'confirmed', 'checked_in', 'checked_out')
              AND b.booking_date <= $1
            ORDER BY r.id, b.booking_date
        `, [endDate.toISOString().split('T')[0]]);
        
        // Format the response
        const calendar = result.rows.map(row => ({
            booking_id: row.booking_id,
            room_id: row.room_id,
            room_title: row.room_title,
            guest_name: row.guest_name,
            check_in: row.check_in,
            check_out: row.check_out,
            status: row.status,
            price: parseFloat(row.price)
        }));
        
        res.json(calendar);
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single booking (admin, manager, frontdesk)
app.get('/api/bookings/:id', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT b.*, r.title as room_name
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE b.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update booking (admin, manager, frontdesk)
app.put('/api/bookings/:id', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, email, booking_date, booking_time, status } = req.body;
        
        // Validate status if provided
        const validStatuses = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid booking status. Must be one of: pending, confirmed, checked_in, checked_out, cancelled' });
        }
        
        // If changing dates, check availability
        if (booking_date) {
            const current = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
            const newBookingDate = booking_date || current.rows[0].booking_date;
            const roomId = current.rows[0].room_id;
            
            const availabilityResult = await pool.query(`
                SELECT * FROM bookings
                WHERE room_id = $1
                  AND status IN ('pending', 'confirmed', 'checked_in')
                  AND booking_date = $2
                  AND id != $3
            `, [roomId, newBookingDate, id]);
            
            if (availabilityResult.rows.length > 0) {
                return res.status(400).json({
                    message: "Room not available for selected date",
                    conflicting_bookings: availabilityResult.rows
                });
            }
        }
        
        const result = await pool.query(`
            UPDATE bookings 
            SET full_name = COALESCE($1, full_name),
                phone = COALESCE($2, phone),
                email = COALESCE($3, email),
                booking_date = COALESCE($4, booking_date),
                booking_time = COALESCE($5, booking_time),
                status = COALESCE($6, status)
            WHERE id = $7
            RETURNING *
        `, [full_name, phone, email, booking_date, booking_time, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        // Auto-update room status based on booking status
        const newStatus = status;
        if (newStatus === 'checked_in' || newStatus === 'checked_out') {
            const roomId = result.rows[0].room_id;
            const newRoomStatus = newStatus === 'checked_in' ? 'occupied' : 'cleaning';
            
            await pool.query('UPDATE rooms SET status = $1 WHERE id = $2', [newRoomStatus, roomId]);
            
            // Send notification emails (async, don't wait)
            if (newStatus === 'checked_out') {
                const booking = result.rows[0];
                
                notificationService.send(pool, 'booking_checked_out', booking).catch(err => 
                    console.error('Error sending receipt email:', err)
                );
            } else if (newStatus === 'checked_in') {
                const booking = result.rows[0];
                
                notificationService.send(pool, 'booking_checked_in', booking).catch(err => 
                    console.error('Error sending check-in email:', err)
                );
            }
        }
        
        res.json({
            message: 'Booking updated',
            booking: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete/cancel booking (admin, manager)
app.delete('/api/bookings/:id', authorizeRole(['admin', 'manager']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===================== FRONT DESK OPERATIONS =====================

// Get today's front desk operations
app.get('/api/frontdesk/today', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Today's check-ins (bookings confirmed for today)
        const checkinsResult = await pool.query(`
            SELECT id as booking_id, full_name as guest_name, room_id, booking_date as check_in
            FROM bookings
            WHERE booking_date = $1 AND status = 'confirmed'
            ORDER BY booking_time
        `, [today]);
        
        // Today's check-outs (checked-in guests leaving today)
        const checkoutsResult = await pool.query(`
            SELECT id as booking_id, full_name as guest_name, room_id, booking_date as check_out
            FROM bookings
            WHERE booking_date = $1 AND status = 'checked_in'
            ORDER BY booking_time
        `, [today]);
        
        // Current guests (checked in and not checked out today)
        const currentGuestsResult = await pool.query(`
            SELECT id as booking_id, full_name as guest_name, room_id, booking_date as check_in, booking_date as check_out
            FROM bookings
            WHERE status = 'checked_in'
            ORDER BY booking_date
        `);
        
        res.json({
            today_checkins: checkinsResult.rows,
            today_checkouts: checkoutsResult.rows,
            current_guests: currentGuestsResult.rows
        });
    } catch (error) {
        console.error('Error getting front desk data:', error);
        res.status(500).json({ message: error.message });
    }
});

// ===================== DASHBOARD STATS =====================

// Get dashboard statistics
app.get('/api/dashboard/stats', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        // Total rooms
        const totalRoomsResult = await pool.query('SELECT COUNT(*) as count FROM rooms');
        const total_rooms = parseInt(totalRoomsResult.rows[0].count);
        
        // Available rooms
        const availableRoomsResult = await pool.query("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'");
        const available_rooms = parseInt(availableRoomsResult.rows[0].count);
        
        // Booked rooms (rooms that are not available)
        const booked_rooms = total_rooms - available_rooms;
        
        // Total bookings
        const totalBookingsResult = await pool.query('SELECT COUNT(*) as count FROM bookings');
        const total_bookings = parseInt(totalBookingsResult.rows[0].count);
        
        // Today's check-ins (bookings with booking_date = today)
        const today = new Date().toISOString().split('T')[0];
        const todayCheckinsResult = await pool.query(
            "SELECT COUNT(*) as count FROM bookings WHERE booking_date::date = $1",
            [today]
        );
        const today_checkins = parseInt(todayCheckinsResult.rows[0].count);
        
        // Today's checkouts (completed bookings)
        const todayCheckoutsResult = await pool.query(
            "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed' AND booking_date::date = $1",
            [today]
        );
        const today_checkouts = parseInt(todayCheckoutsResult.rows[0].count);
        
        res.json({
            total_rooms,
            available_rooms,
            booked_rooms,
            total_bookings,
            today_checkins,
            today_checkouts
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get business analytics (admin, manager)
app.get('/api/dashboard/business', authorizeRole(['admin', 'manager']), async (req, res) => {
    try {
        // Total rooms
        const totalRoomsResult = await pool.query('SELECT COUNT(*) as count FROM rooms');
        const total_rooms = parseInt(totalRoomsResult.rows[0].count);
        
        // Occupied rooms (status = 'occupied')
        const occupiedRoomsResult = await pool.query("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'");
        const occupied_rooms = parseInt(occupiedRoomsResult.rows[0].count);
        
        // Available rooms
        const availableRoomsResult = await pool.query("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'");
        const available_rooms = parseInt(availableRoomsResult.rows[0].count);
        
        // Occupancy rate
        const occupancy_rate = total_rooms > 0 ? Math.round((occupied_rooms / total_rooms) * 100) : 0;
        
        // Revenue today (from checked_in bookings with today's booking_date)
        const today = new Date().toISOString().split('T')[0];
        const revenueTodayResult = await pool.query(
            "SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE status = 'checked_in' AND booking_date::date = $1",
            [today]
        );
        const revenue_today = parseFloat(revenueTodayResult.rows[0].total) || 0;
        
        // Revenue this month (from checked_in and checked_out bookings)
        const revenueMonthResult = await pool.query(
            "SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE status IN ('checked_in', 'checked_out') AND DATE_TRUNC('month', booking_date) = DATE_TRUNC('month', CURRENT_DATE)"
        );
        const revenue_this_month = parseFloat(revenueMonthResult.rows[0].total) || 0;
        
        // Average room rate
        const avgRateResult = await pool.query('SELECT AVG(price) as avg FROM rooms');
        const average_room_rate = Math.round(parseFloat(avgRateResult.rows[0].avg) || 0);
        
        res.json({
            total_rooms,
            occupied_rooms,
            available_rooms,
            occupancy_rate,
            revenue_today,
            revenue_this_month,
            average_room_rate
        });
    } catch (error) {
        console.error('Error getting business analytics:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get housekeeping status (admin, manager, frontdesk)
app.get('/api/housekeeping/status', authorizeRole(['admin', 'manager', 'frontdesk']), async (req, res) => {
    try {
        // Rooms that need cleaning (status = 'cleaning')
        const cleaningResult = await pool.query(
            "SELECT id, title, status FROM rooms WHERE status = 'cleaning' ORDER BY id"
        );
        
        // Maintenance rooms
        const maintenanceResult = await pool.query(
            "SELECT id, title, status FROM rooms WHERE status = 'maintenance' ORDER BY id"
        );
        
        // Available rooms (ready for guests)
        const availableResult = await pool.query(
            "SELECT id, title, status FROM rooms WHERE status = 'available' ORDER BY id"
        );
        
        // Occupied rooms (currently in use)
        const occupiedResult = await pool.query(
            "SELECT id, title, status FROM rooms WHERE status = 'occupied' ORDER BY id"
        );
        
        res.json({
            rooms_to_clean: cleaningResult.rows,
            maintenance_rooms: maintenanceResult.rows,
            available_rooms: availableResult.rows,
            occupied_rooms: occupiedResult.rows
        });
    } catch (error) {
        console.error('Error getting housekeeping status:', error);
        res.status(500).json({ message: error.message });
    }
});

// ===================== EMAIL NOTIFICATION SETTINGS =====================

// Get email settings (admin, manager)
app.get('/api/settings/email', authorizeRole(['admin', 'manager']), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM hotel_settings LIMIT 1');
        const settings = result.rows[0];
        
        // Don't return API key for security
        if (settings) {
            settings.api_key = settings.api_key ? '***configured***' : null;
        }
        
        res.json(settings || {});
    } catch (error) {
        console.error('Error getting email settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update email settings (admin only)
app.put('/api/settings/email', authorizeRole(['admin']), async (req, res) => {
    try {
        const { hotel_name, email_service, api_key, sender_email, domain, api_url } = req.body;
        
        // Check if settings exist
        const existing = await pool.query('SELECT id FROM hotel_settings LIMIT 1');
        
        if (existing.rows.length > 0) {
            // Update existing
            await pool.query(`
                UPDATE hotel_settings 
                SET hotel_name = $1, 
                    email_service = $2, 
                    api_key = COALESCE($3, api_key),
                    sender_email = $4,
                    domain = $5,
                    api_url = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
            `, [hotel_name, email_service, api_key, sender_email, domain, api_url, existing.rows[0].id]);
        } else {
            // Insert new
            await pool.query(`
                INSERT INTO hotel_settings (hotel_name, email_service, api_key, sender_email, domain, api_url)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [hotel_name, email_service, api_key, sender_email, domain, api_url]);
        }
        
        res.json({ message: 'Email settings updated successfully' });
    } catch (error) {
        console.error('Error updating email settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get email logs (admin, manager)
app.get('/api/settings/email/logs', authorizeRole(['admin', 'manager']), async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const result = await pool.query(`
            SELECT * FROM email_logs 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        const countResult = await pool.query('SELECT COUNT(*) as total FROM email_logs');
        
        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].total)
        });
    } catch (error) {
        console.error('Error getting email logs:', error);
        res.status(500).json({ message: error.message });
    }
});

// ===================== DATABASE INITIALIZATION =====================

async function initializeDatabase() {
    try {
        const client = await pool.connect();
        console.log('Database connected successfully');
        client.release();
        
        // Create rooms table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                amenities TEXT,
                status VARCHAR(50) DEFAULT 'available',
                image_url TEXT,
                beds INTEGER DEFAULT 1,
                baths INTEGER DEFAULT 1,
                guests INTEGER DEFAULT 2,
                size INTEGER DEFAULT 25,
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create bookings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100) NOT NULL,
                booking_date DATE NOT NULL,
                booking_time VARCHAR(10),
                message TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                price DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT fk_room
                    FOREIGN KEY(room_id) 
                    REFERENCES rooms(id)
                    ON DELETE CASCADE
            )
        `);
        
        // Create hotel_settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hotel_settings (
                id SERIAL PRIMARY KEY,
                hotel_name VARCHAR(100) NOT NULL DEFAULT 'My Hotel',
                email_service VARCHAR(50),
                api_key TEXT,
                sender_email VARCHAR(100),
                domain VARCHAR(100),
                api_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Insert default hotel settings if not exists
        const existingSettings = await pool.query('SELECT COUNT(*) as count FROM hotel_settings');
        if (parseInt(existingSettings.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO hotel_settings (hotel_name, email_service, sender_email)
                VALUES ('My Hotel', 'sendgrid', 'noreply@hotel.com')
            `);
        }
        
        // Create email_logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_logs (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER,
                recipient VARCHAR(100),
                event VARCHAR(50),
                status VARCHAR(20),
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create sample user accounts (passwords hashed with bcrypt)
        const sampleUsers = [
            { username: 'kwesi', password: 'kwesi123', role: 'admin' },
            { username: 'ama', password: 'ama123', role: 'manager' },
            { username: 'kofi', password: 'kofi123', role: 'frontdesk' }
        ];
        
        // Drop existing users table to avoid old schema issues
        await pool.query('DROP TABLE IF EXISTS users CASCADE');
        
        // Create users table (for RBAC)
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        for (const user of sampleUsers) {
            try {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.query(
                    "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
                    [user.username, hashedPassword, user.role]
                );
            } catch (err) {
                console.log('User creation skipped:', err.message);
            }
        }
        
        console.log('Sample users created: kwesi(admin), ama(manager), kofi(frontdesk)');
        
        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Database initialization error:', error.message);
    }
}

// Initialize database (non-blocking)
initializeDatabase().catch(err => console.error('Database init failed:', err));

// Start check-in reminder cron job
const { startCheckinReminderJob } = require('./cronJobs/checkinReminderJob');
startCheckinReminderJob(pool);

// Fallback route to serve static HTML files
app.get('*', (req, res) => {
    const requestedPath = req.path;
    
    // Try to find the file in public folder
    const fs = require('fs');
    const path = require('path');
    
    // Remove leading slash and look in public folder
    let filePath = path.join(__dirname, 'public', requestedPath);
    
    // If it's a directory, look for index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }
    
    // Check if file exists and serve it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        // Try with .html extension
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
            res.sendFile(htmlPath);
        } else {
            res.status(404).send('Not Found');
        }
    }
});

// ===================== START SERVER =====================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
