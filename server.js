const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

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

// ===================== SYSTEM STATUS =====================

// Root endpoint - system status
app.get('/', (req, res) => {
    res.json({
        message: "Hotel Booking Backend API Running"
    });
});

// ===================== ROOMS SYSTEM =====================

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single room
app.get('/api/rooms/:id', async (req, res) => {
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

// Create room
app.post('/api/rooms', async (req, res) => {
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

// Update room
app.put('/api/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, amenities, status, beds, baths, guests, size, location } = req.body;
        
        const result = await pool.query(`
            UPDATE rooms 
            SET title = $1, description = $2, price = $3, amenities = $4, status = $5, beds = $6, baths = $7, guests = $8, size = $9, location = $10
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

// Delete room
app.delete('/api/rooms/:id', async (req, res) => {
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

// Create booking (with availability check)
app.post('/api/bookings', async (req, res) => {
    try {
        const { room_id, guest_name, guest_email, guest_phone, check_in, check_out } = req.body;
        
        // Validate required fields
        if (!room_id || !guest_name || !guest_email || !check_in || !check_out) {
            return res.status(400).json({ 
                error: 'room_id, guest_name, guest_email, check_in, and check_out are required' 
            });
        }
        
        // Step 1: Check room availability
        const availabilityResult = await pool.query(`
            SELECT * FROM bookings
            WHERE room_id = $1
              AND status = 'confirmed'
              AND $2 < check_out
              AND $3 > check_in
        `, [room_id, check_in, check_out]);
        
        // Step 2: If not available, reject
        if (availabilityResult.rows.length > 0) {
            return res.status(400).json({
                message: "Room not available for selected dates",
                conflicting_bookings: availabilityResult.rows
            });
        }
        
        // Step 3: If available, insert booking
        const result = await pool.query(`
            INSERT INTO bookings (room_id, guest_name, guest_email, guest_phone, check_in, check_out, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
            RETURNING *
        `, [room_id, guest_name, guest_email, guest_phone, check_in, check_out]);
        
        res.status(201).json({
            message: 'Booking successful',
            booking: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
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

// Get single booking
app.get('/api/bookings/:id', async (req, res) => {
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

// Update booking
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { guest_name, guest_email, guest_phone, check_in, check_out, status } = req.body;
        
        // If changing dates, check availability
        if (check_in || check_out) {
            const current = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
            const newCheckIn = check_in || current.rows[0].check_in;
            const newCheckOut = check_out || current.rows[0].check_out;
            const roomId = current.rows[0].room_id;
            
            const availabilityResult = await pool.query(`
                SELECT * FROM bookings
                WHERE room_id = $1
                  AND status = 'confirmed'
                  AND $2 < check_out
                  AND $3 > check_in
                  AND id != $4
            `, [roomId, newCheckIn, newCheckOut, id]);
            
            if (availabilityResult.rows.length > 0) {
                return res.status(400).json({
                    message: "Room not available for selected dates",
                    conflicting_bookings: availabilityResult.rows
                });
            }
        }
        
        const result = await pool.query(`
            UPDATE bookings 
            SET guest_name = COALESCE($1, guest_name),
                guest_email = COALESCE($2, guest_email),
                guest_phone = COALESCE($3, guest_phone),
                check_in = COALESCE($4, check_in),
                check_out = COALESCE($5, check_out),
                status = COALESCE($6, status)
            WHERE id = $7
            RETURNING *
        `, [guest_name, guest_email, guest_phone, check_in, check_out, status, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
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

// Delete/cancel booking
app.delete('/api/bookings/:id', async (req, res) => {
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
                guest_name VARCHAR(100) NOT NULL,
                guest_email VARCHAR(100) NOT NULL,
                guest_phone VARCHAR(20),
                check_in DATE NOT NULL,
                check_out DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                CONSTRAINT fk_room
                    FOREIGN KEY(room_id) 
                    REFERENCES rooms(id)
                    ON DELETE CASCADE
            )
        `);
        
        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Database initialization error:', error.message);
    }
}

// Initialize database (non-blocking)
initializeDatabase().catch(err => console.error('Database init failed:', err));

// ===================== START SERVER =====================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
