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

// Bookings placeholder
app.get('/api/bookings', (req, res) => {
    res.json({
        message: "Bookings system coming next"
    });
});

app.post('/api/bookings', (req, res) => {
    res.json({
        message: "Bookings system coming next"
    });
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
