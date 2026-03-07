const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
    secret: 'hotel_secret_key_2024',
    resave: false,
    saveUninitialized: false
}));

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// API root - backend status
app.get('/', (req, res) => {
    res.json({
        message: "Hotel Booking Backend API Running",
        version: "1.0.0",
        endpoints: {
            rooms: "/api/rooms",
            availableRooms: "/api/rooms/available",
            adminRooms: "/api/admin/rooms"
        }
    });
});

// Database initialization
async function initializeDatabase() {
    try {
        const client = await pool.connect();
        console.log('Database connected successfully');
        client.release();
        
        // Create admins table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                phone VARCHAR(50),
                role VARCHAR(50) DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
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
                rating DECIMAL(3, 2) DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                beds INTEGER DEFAULT 1,
                baths INTEGER DEFAULT 1,
                guests INTEGER DEFAULT 2,
                size INTEGER DEFAULT 25,
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create room_images table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS room_images (
                id SERIAL PRIMARY KEY,
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create bookings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                room_id INTEGER REFERENCES rooms(id),
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                email VARCHAR(255),
                booking_date DATE NOT NULL,
                booking_time TIME,
                check_in DATE,
                check_out DATE,
                guests INTEGER DEFAULT 1,
                total_price DECIMAL(10, 2),
                message TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) UNIQUE NOT NULL,
                value TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create dining table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dining (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url TEXT,
                price DECIMAL(10, 2),
                category VARCHAR(100),
                available BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create discover table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS discover (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url TEXT,
                category VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create food table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS food (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                category VARCHAR(100),
                image_url TEXT,
                available BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Create orders table for food
        await pool.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_name VARCHAR(255),
                customer_phone VARCHAR(50),
                items JSONB,
                total_amount DECIMAL(10, 2),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Database tables created successfully');
        
        // Insert default admin if not exists
        try {
            const adminExists = await pool.query("SELECT * FROM admins WHERE username = 'kwesi'");
            if (adminExists.rows.length === 0) {
                const hashedPassword = await bcrypt.hash('kwesi123', 10);
                await pool.query(
                    "INSERT INTO admins (username, password) VALUES ($1, $2)",
                    ['kwesi', hashedPassword]
                );
                console.log('Default admin created: kwesi / kwesi123');
            }
        } catch (adminError) {
            console.log('Admin creation skipped:', adminError.message);
        }
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error.message);
    }
}

// Initialize database (non-blocking)
initializeDatabase().catch(err => console.error('Database init failed:', err));

// ===================== ROOM ENDPOINTS =====================

// Get all rooms (public)
app.get('/api/rooms', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   COALESCE(array_agg(ri.image_url) FILTER (WHERE ri.image_url IS NOT NULL), ARRAY[]::text[]) as images
            FROM rooms r
            LEFT JOIN room_images ri ON r.id = ri.room_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);
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
        const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
        
        if (roomResult.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        const imagesResult = await pool.query(
            'SELECT image_url FROM room_images WHERE room_id = $1',
            [id]
        );
        
        const room = roomResult.rows[0];
        room.images = imagesResult.rows.map(row => row.image_url);
        
        res.json(room);
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get room images
app.get('/api/rooms/:id/images', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM room_images WHERE room_id = $1 ORDER BY created_at',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get available rooms
app.get('/api/rooms/available', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   COALESCE(array_agg(ri.image_url) FILTER (WHERE ri.image_url IS NOT NULL), ARRAY[]::text[]) as images
            FROM rooms r
            LEFT JOIN room_images ri ON r.id = ri.room_id
            WHERE r.status = 'available'
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching available rooms:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create booking (public)
app.post('/api/bookings', async (req, res) => {
    try {
        const { room_id, full_name, phone, email, booking_date, booking_time, check_in, check_out, guests, total_price, message } = req.body;
        
        if (!room_id || !full_name || !booking_date) {
            return res.status(400).json({ error: 'Room, name and date are required' });
        }
        
        // Check if room is available
        const roomCheck = await pool.query('SELECT status FROM rooms WHERE id = $1', [room_id]);
        if (roomCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        if (roomCheck.rows[0].status !== 'available') {
            return res.status(400).json({ error: 'Room is not available' });
        }
        
        const result = await pool.query(`
            INSERT INTO bookings (room_id, full_name, phone, email, booking_date, booking_time, check_in, check_out, guests, total_price, message, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
            RETURNING *
        `, [room_id, full_name, phone, email, booking_date, booking_time, check_in, check_out, guests, total_price, message]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, r.title as room_title
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.id
            ORDER BY b.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get settings
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===================== ADMIN ENDPOINTS =====================

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
    }
    next();
}

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const admin = result.rows[0];
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;
        
        res.json({ 
            message: 'Admin login successful', 
            admin: { 
                id: admin.id, 
                username: admin.username
            } 
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});

// Check admin auth
app.get('/api/admin/check-auth', (req, res) => {
    if (req.session.adminId) {
        res.json({ 
            authenticated: true, 
            admin: { 
                id: req.session.adminId, 
                username: req.session.adminUsername 
            } 
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Image upload endpoint (admin only)
app.post('/api/upload', requireAdmin, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        res.json({ 
            imageUrl: `/uploads/${req.file.filename}`,
            filename: req.file.filename
        });
    });
});

// Get all bookings (admin)
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, r.title as room_title
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.id
            ORDER BY b.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update booking status (admin)
app.put('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all rooms (admin)
app.get('/api/admin/rooms', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   COALESCE(array_agg(ri.image_url) FILTER (WHERE ri.image_url IS NOT NULL), ARRAY[]::text[]) as images
            FROM rooms r
            LEFT JOIN room_images ri ON r.id = ri.room_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create room (admin)
app.post('/api/admin/rooms', requireAdmin, async (req, res) => {
    try {
        const { title, description, price, amenities, status, image_url, beds, baths, guests, size, location } = req.body;
        
        if (!title || !price) {
            return res.status(400).json({ error: 'Title and price are required' });
        }
        
        const result = await pool.query(`
            INSERT INTO rooms (title, description, price, amenities, status, image_url, beds, baths, guests, size, location)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [title, description, price, amenities, status || 'available', image_url, beds || 1, baths || 1, guests || 2, size || 25, location]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update room (admin)
app.put('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, amenities, status, image_url, beds, baths, guests, size, location } = req.body;
        
        const result = await pool.query(`
            UPDATE rooms 
            SET title = $1, description = $2, price = $3, amenities = $4, status = $5, image_url = $6, beds = $7, baths = $8, guests = $9, size = $10, location = $11
            WHERE id = $12
            RETURNING *
        `, [title, description, price, amenities, status, image_url, beds, baths, guests, size, location, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete room (admin)
app.delete('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM room_images WHERE room_id = $1', [id]);
        await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
        
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload room image (admin)
app.post('/api/admin/rooms/:id/images', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await pool.query(
            'INSERT INTO room_images (room_id, image_url) VALUES ($1, $2)',
            [id, imageUrl]
        );
        
        res.json({ imageUrl, message: 'Image uploaded successfully' });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete room image (admin)
app.delete('/api/admin/rooms/:roomId/images/:imageId', requireAdmin, async (req, res) => {
    try {
        const { roomId, imageId } = req.params;
        
        await pool.query('DELETE FROM room_images WHERE id = $1 AND room_id = $2', [imageId, roomId]);
        
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const roomsCount = await pool.query('SELECT COUNT(*) as count FROM rooms');
        const bookingsCount = await pool.query('SELECT COUNT(*) as count FROM bookings');
        const pendingBookings = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
        const revenueResult = await pool.query("SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'approved'");
        
        res.json({
            totalRooms: parseInt(roomsCount.rows[0].count),
            totalBookings: parseInt(bookingsCount.rows[0].count),
            pendingBookings: parseInt(pendingBookings.rows[0].count),
            totalRevenue: parseFloat(revenueResult.rows[0].total)
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update settings (admin)
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(`
                INSERT INTO settings (key, value, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
            `, [key, value]);
        }
        
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get dining items (admin)
app.get('/api/admin/dining', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dining ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching dining:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add dining item
app.post('/api/admin/dining', requireAdmin, async (req, res) => {
    try {
        const { title, description, image_url, price, category, available } = req.body;
        
        const result = await pool.query(`
            INSERT INTO dining (title, description, image_url, price, category, available)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [title, description, image_url, price, category, available !== false]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding dining:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update dining item
app.put('/api/admin/dining/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, price, category, available } = req.body;
        
        const result = await pool.query(`
            UPDATE dining SET title = $1, description = $2, image_url = $3, price = $4, category = $5, available = $6
            WHERE id = $7
            RETURNING *
        `, [title, description, image_url, price, category, available, id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating dining:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete dining item
app.delete('/api/admin/dining/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM dining WHERE id = $1', [id]);
        res.json({ message: 'Dining item deleted' });
    } catch (error) {
        console.error('Error deleting dining:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get discover items (admin)
app.get('/api/admin/discover', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM discover ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching discover:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add discover item
app.post('/api/admin/discover', requireAdmin, async (req, res) => {
    try {
        const { title, description, image_url, category } = req.body;
        
        const result = await pool.query(`
            INSERT INTO discover (title, description, image_url, category)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [title, description, image_url, category]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding discover:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update discover item
app.put('/api/admin/discover/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, category } = req.body;
        
        const result = await pool.query(`
            UPDATE discover SET title = $1, description = $2, image_url = $3, category = $4
            WHERE id = $5
            RETURNING *
        `, [title, description, image_url, category, id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating discover:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete discover item
app.delete('/api/admin/discover/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM discover WHERE id = $1', [id]);
        res.json({ message: 'Discover item deleted' });
    } catch (error) {
        console.error('Error deleting discover:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get food items (admin)
app.get('/api/admin/food', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM food ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching food:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add food item
app.post('/api/admin/food', requireAdmin, async (req, res) => {
    try {
        const { name, description, price, category, image_url, available } = req.body;
        
        const result = await pool.query(`
            INSERT INTO food (name, description, price, category, image_url, available)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [name, description, price, category, image_url, available !== false]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding food:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update food item
app.put('/api/admin/food/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, image_url, available } = req.body;
        
        const result = await pool.query(`
            UPDATE food SET name = $1, description = $2, price = $3, category = $4, image_url = $5, available = $6
            WHERE id = $7
            RETURNING *
        `, [name, description, price, category, image_url, available, id]);
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating food:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete food item
app.delete('/api/admin/food/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM food WHERE id = $1', [id]);
        res.json({ message: 'Food item deleted' });
    } catch (error) {
        console.error('Error deleting food:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get dining orders (admin)
app.get('/api/admin/dining-orders', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update dining order status (admin)
app.put('/api/admin/dining-orders/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get contact settings (admin)
app.get('/api/admin/contact', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM settings WHERE key LIKE 'contact%'");
        const contact = {};
        result.rows.forEach(row => {
            contact[row.key] = row.value;
        });
        res.json(contact);
    } catch (error) {
        console.error('Error fetching contact settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update contact settings
app.put('/api/admin/contact', requireAdmin, async (req, res) => {
    try {
        const { contact_email, contact_phone, contact_address, contact_facebook, contact_instagram, contact_twitter } = req.body;
        
        const settings = {
            contact_email,
            contact_phone,
            contact_address,
            contact_facebook,
            contact_instagram,
            contact_twitter
        };
        
        for (const [key, value] of Object.entries(settings)) {
            if (value !== undefined) {
                await pool.query(`
                    INSERT INTO settings (key, value, updated_at)
                    VALUES ($1, $2, CURRENT_TIMESTAMP)
                    ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
                `, [key, value]);
            }
        }
        
        res.json({ message: 'Contact settings updated' });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===================== PUBLIC DINING/DISCOVER ENDPOINTS =====================

// Get dining items (public)
app.get('/api/dining', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dining WHERE available = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching dining:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get food items (public)
app.get('/api/food', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM food WHERE available = true ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching food:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get discover items (public)
app.get('/api/discover', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM discover ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching discover:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create food order (public)
app.post('/api/orders', async (req, res) => {
    try {
        const { customer_name, customer_phone, items, total_amount } = req.body;
        
        if (!customer_name || !items || !total_amount) {
            return res.status(400).json({ error: 'Name, items and total are required' });
        }
        
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        const result = await pool.query(`
            INSERT INTO orders (order_number, customer_name, customer_phone, items, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `, [orderNumber, customer_name, customer_phone, JSON.stringify(items), total_amount]);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server even if database fails
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
