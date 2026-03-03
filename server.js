const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hotel_booking'
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
    secret: 'hotel-booking-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Ensure uploads directory exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database initialization
async function initializeDatabase() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
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
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL,
                booking_date DATE NOT NULL,
                booking_time VARCHAR(50) NOT NULL,
                message TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                hotel_name VARCHAR(255) DEFAULT 'Grand Hotel',
                hotel_tagline TEXT,
                hotel_phone VARCHAR(50),
                hotel_email VARCHAR(255),
                hotel_address TEXT,
                hero_title VARCHAR(255),
                hero_text TEXT,
                about_title VARCHAR(255),
                about_text TEXT,
                about_image TEXT,
                checkin_time VARCHAR(50),
                checkout_time VARCHAR(50),
                front_desk_hours VARCHAR(100),
                copyright_year VARCHAR(10),
                company_name VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default admin if not exists
        const adminExists = await pool.query("SELECT * FROM users WHERE email = 'admin@hotel.com'");
        if (adminExists.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
                ['Administrator', 'admin@hotel.com', hashedPassword, 'admin']
            );
            console.log('Default admin created: admin@hotel.com / admin123');
        }

        // Insert default settings if not exists
        const settingsExist = await pool.query("SELECT * FROM settings WHERE id = 1");
        if (settingsExist.rows.length === 0) {
            await pool.query(
                "INSERT INTO settings (id, hotel_name, copyright_year, company_name) VALUES (1, 'Grand Hotel', $1, 'Grand Hotel')",
                [new Date().getFullYear()]
            );
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Initialize database
initializeDatabase();

// Helper function to run queries
function query(sql, params = []) {
    return pool.query(sql, params);
}

// Routes

// Home page - get hotel info
app.get('/api/hotel-info', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        res.json(result.rows[0] || { hotel_name: 'Grand Hotel' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all rooms (public)
app.get('/api/rooms', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single room
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get room images
app.get('/api/rooms/:id/images', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM room_images WHERE room_id = $1', [req.params.id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { room_id, full_name, phone, email, booking_date, booking_time, message } = req.body;

        // Check if room is available
        const room = await pool.query('SELECT status FROM rooms WHERE id = $1', [room_id]);
        if (room.rows.length === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        if (room.rows[0].status !== 'available') {
            return res.status(400).json({ error: 'Room is not available' });
        }

        // Check date is not in the past
        const today = new Date().toISOString().split('T')[0];
        if (booking_date < today) {
            return res.status(400).json({ error: 'Booking date cannot be in the past' });
        }

        const result = await pool.query(
            'INSERT INTO bookings (room_id, full_name, phone, email, booking_date, booking_time, message, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [room_id, full_name, phone, email, booking_date, booking_time, message, 'pending']
        );

        res.status(201).json({ message: 'Booking submitted successfully', booking: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.user = user;
        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

// Check admin auth
app.get('/api/admin/check', (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
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
        res.status(500).json({ error: error.message });
    }
});

// Update booking status (admin)
app.put('/api/admin/bookings/:id', requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query('UPDATE bookings SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Booking status updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all rooms (admin)
app.get('/api/admin/rooms', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create room (admin)
app.post('/api/admin/rooms', requireAdmin, async (req, res) => {
    try {
        const { title, description, price, amenities, status, image_url } = req.body;
        const result = await pool.query(
            'INSERT INTO rooms (title, description, price, amenities, status, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [title, description, price, amenities, status || 'available', image_url]
        );
        res.status(201).json({ message: 'Room created successfully', room: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update room (admin)
app.put('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
    try {
        const { title, description, price, amenities, status, image_url } = req.body;
        await pool.query(
            'UPDATE rooms SET title = $1, description = $2, price = $3, amenities = $4, status = $5, image_url = $6 WHERE id = $7',
            [title, description, price, amenities, status, image_url, req.params.id]
        );
        res.json({ message: 'Room updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete room (admin)
app.delete('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload room image (admin)
app.post('/api/admin/rooms/:id/images', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const imageUrl = '/uploads/' + req.file.filename;
        await pool.query('INSERT INTO room_images (room_id, image_url) VALUES ($1, $2)', [req.params.id, imageUrl]);
        res.json({ message: 'Image uploaded successfully', image_url: imageUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get settings (public)
app.get('/api/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings WHERE id = 1');
        res.json(result.rows[0] || { hotel_name: 'Grand Hotel' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings (admin)
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const { hotel_name, hotel_tagline, hotel_phone, hotel_email, hotel_address, hero_title, hero_text, about_title, about_text, about_image, checkin_time, checkout_time, front_desk_hours, copyright_year, company_name } = req.body;
        
        await pool.query(`
            UPDATE settings SET 
                hotel_name = $1, hotel_tagline = $2, hotel_phone = $3, 
                hotel_email = $4, hotel_address = $5, hero_title = $6, hero_text = $7, 
                about_title = $8, about_text = $9, about_image = $10, checkin_time = $11, 
                checkout_time = $12, front_desk_hours = $13, copyright_year = $14, company_name = $15,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = 1`,
            [hotel_name, hotel_tagline, hotel_phone, hotel_email, hotel_address, 
             hero_title, hero_text, about_title, about_text, about_image, 
             checkin_time, checkout_time, front_desk_hours, copyright_year, company_name]
        );
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Hotel Booking System running on http://localhost:${PORT}`);
});
