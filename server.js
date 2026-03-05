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

// Trust proxy for Render
app.set('trust proxy', 1);

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
    resave: true,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true
    }
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
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Database initialization
async function initializeDatabase() {
    try {
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255),
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                permissions JSONB DEFAULT '{"overview": true, "rooms": true, "discover": true, "dining": true, "contact": true, "media": true, "settings": false, "users": false}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Add username column if it doesn't exist (for existing databases)
        try {
            await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE`);
        } catch (e) {
            // Column may already exist
        }

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
        
        // Add new columns if they don't exist (for existing databases)
        try {
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0`);
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0`);
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS beds INTEGER DEFAULT 1`);
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS baths INTEGER DEFAULT 1`);
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS guests INTEGER DEFAULT 2`);
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 25`);
            await pool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS location VARCHAR(255)`);
        } catch (e) {
            // Columns may already exist
        }

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
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                email VARCHAR(255) NOT NULL,
                booking_date DATE NOT NULL,
                booking_time VARCHAR(50) NOT NULL,
                message TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                check_in_date DATE,
                check_out_date DATE,
                booking_status VARCHAR(20) DEFAULT 'reserved',
                payment_status VARCHAR(20) DEFAULT 'unpaid',
                total_price DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Add new columns to bookings if they don't exist
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
        } catch (e) {
            // Column may already exist, ignore error
        }
        
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_date DATE`);
        } catch (e) {}
        
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_date DATE`);
        } catch (e) {}
        
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status VARCHAR(20) DEFAULT 'reserved'`);
        } catch (e) {}
        
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'unpaid'`);
        } catch (e) {}
        
        try {
            await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2)`);
        } catch (e) {}

        // Create indexes for performance
        try {
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_room_dates ON bookings (room_id, check_in_date, check_out_date)`);
        } catch (e) {}
        try {
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (booking_status)`);
        } catch (e) {}
        try {
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id)`);
        } catch (e) {}
        try {
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status)`);
        } catch (e) {}

        // Create settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                hotel_name VARCHAR(255) DEFAULT 'Grand Horizon Suites',
                hotel_tagline TEXT,
                hotel_phone VARCHAR(50),
                hotel_email VARCHAR(255),
                hotel_address TEXT,
                
                hero_title VARCHAR(255),
                hero_text TEXT,
                hero_image TEXT,
                
                rooms_hero_title VARCHAR(255),
                rooms_hero_text TEXT,
                rooms_hero_image TEXT,
                
                discover_hero_title VARCHAR(255),
                discover_hero_text TEXT,
                discover_hero_image TEXT,
                
                dining_hero_title VARCHAR(255),
                dining_hero_text TEXT,
                dining_hero_image TEXT,
                
                contact_hero_title VARCHAR(255),
                contact_hero_text TEXT,
                contact_hero_image TEXT,
                
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
        
        // Add new columns if they don't exist (for existing databases)
        try {
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS rooms_hero_title VARCHAR(255)`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS rooms_hero_text TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS rooms_hero_image TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS discover_hero_title VARCHAR(255)`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS discover_hero_text TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS discover_hero_image TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS dining_hero_title VARCHAR(255)`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS dining_hero_text TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS dining_hero_image TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_hero_title VARCHAR(255)`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_hero_text TEXT`);
            await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS contact_hero_image TEXT`);
        } catch (e) {
            // Columns may already exist
        }

        // Create overview_sections table (8 blocks for Overview page)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS overview_sections (
                id SERIAL PRIMARY KEY,
                section_key VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(255),
                description TEXT,
                image_url TEXT,
                display_order INTEGER DEFAULT 0,
                is_visible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create discover_items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS discover_items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url TEXT,
                display_order INTEGER DEFAULT 0,
                is_visible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create dining_items table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dining_items (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                image_url TEXT,
                opening_hours VARCHAR(100),
                price_range VARCHAR(50),
                display_order INTEGER DEFAULT 0,
                is_visible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create contact_settings table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                phone VARCHAR(50),
                email VARCHAR(255),
                address TEXT,
                map_link TEXT,
                live_chat_enabled BOOLEAN DEFAULT false,
                contact_form_email VARCHAR(255),
                facebook_link VARCHAR(255),
                instagram_link VARCHAR(255),
                twitter_link VARCHAR(255),
                whatsapp VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create media_library table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS media_library (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                original_name VARCHAR(255),
                file_path TEXT NOT NULL,
                file_size INTEGER,
                mime_type VARCHAR(100),
                alt_text VARCHAR(255),
                is_used BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert default overview sections
        const overviewSections = [
            { key: 'hero', title: 'Hero Section', order: 1 },
            { key: 'elegant_spaces', title: 'Elegant Spaces', order: 2 },
            { key: 'culinary', title: 'Culinary Experience', order: 3 },
            { key: 'spa_wellness', title: 'Spa & Wellness', order: 4 },
            { key: 'dining', title: 'Dining Experience', order: 5 },
            { key: 'modern_elegance', title: 'Modern Elegance', order: 6 },
            { key: 'signature_restaurant', title: 'Signature Restaurant', order: 7 },
            { key: 'poolside_lunch', title: 'Poolside Lunch', order: 8 }
        ];
        
        for (const section of overviewSections) {
            const exists = await pool.query('SELECT * FROM overview_sections WHERE section_key = $1', [section.key]);
            if (exists.rows.length === 0) {
                await pool.query(
                    'INSERT INTO overview_sections (section_key, title, display_order) VALUES ($1, $2, $3)',
                    [section.key, section.title, section.order]
                );
            }
        }

        // Insert default contact settings if not exists
        const contactExist = await pool.query('SELECT * FROM contact_settings WHERE id = 1');
        if (contactExist.rows.length === 0) {
            await pool.query(
                "INSERT INTO contact_settings (id, phone, email, address) VALUES (1, '+233 20 123 4567', 'info@hotel.com', 'Accra, Ghana')"
            );
        }

        console.log('Database tables created successfully');

        // Insert default admin if not exists
        try {
            const adminExists = await pool.query("SELECT * FROM users WHERE username = 'kwesi Otabil'");
            if (adminExists.rows.length === 0) {
                const hashedPassword = await bcrypt.hash('Jiddel123@', 10);
                await pool.query(
                    "INSERT INTO users (name, username, email, password, role) VALUES ($1, $2, $3, $4, $5)",
                    ['Kwesi Otabil', 'kwesi Otabil', 'admin@hotel.com', hashedPassword, 'main_admin']
                );
                console.log('Default admin created: kwesi Otabil / Jiddel123@');
            }
        } catch (adminError) {
            console.log('Admin creation skipped:', adminError.message);
        }

        // Insert default settings if not exists
        const settingsExist = await pool.query("SELECT * FROM settings WHERE id = 1");
        if (settingsExist.rows.length === 0) {
            await pool.query(
                "INSERT INTO settings (id, hotel_name, hero_title, hero_text, checkin_time, checkout_time, copyright_year, company_name) VALUES (1, 'Grand Horizon Suites', 'Luxury Accommodations in the Heart of the City', 'Experience comfort and elegance at Grand Horizon Suites', '2:00 PM', '12:00 PM', $1, 'Grand Horizon Suites')",
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
        
        // Get images for each room
        const roomsWithImages = await Promise.all(result.rows.map(async (room) => {
            const imagesResult = await pool.query('SELECT image_url FROM room_images WHERE room_id = $1', [room.id]);
            room.images = imagesResult.rows.map(img => img.image_url);
            return room;
        }));
        
        res.json(roomsWithImages);
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
        
        const room = result.rows[0];
        
        // Get images for this room
        const imagesResult = await pool.query('SELECT image_url FROM room_images WHERE room_id = $1', [room.id]);
        room.images = imagesResult.rows.map(img => img.image_url);
        
        res.json(room);
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

// Import availability service
const { isRoomAvailable, calculateTotalPrice } = require('./services/availabilityService');

// Import email service
const { sendBookingConfirmation, sendCancellationEmail, sendCheckInEmail } = require('./services/emailService');

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { room_id, full_name, phone, email, check_in_date, check_out_date, message } = req.body;

        // Check if room is available using the availability service
        const available = await isRoomAvailable(room_id, check_in_date, check_out_date);
        if (!available) {
            return res.status(400).json({ error: 'Room not available for selected dates' });
        }

        // Check date is not in the past
        const today = new Date().toISOString().split('T')[0];
        if (check_in_date < today) {
            return res.status(400).json({ error: 'Check-in date cannot be in the past' });
        }

        // Get user_id if user is logged in
        const userId = req.session.user ? req.session.user.id : null;

        // Calculate total price
        const totalPrice = await calculateTotalPrice(room_id, check_in_date, check_out_date);

        // Get room info for booking_time (default to noon)
        const bookingTime = '12:00';

        const result = await pool.query(
            'INSERT INTO bookings (user_id, room_id, full_name, phone, email, booking_date, booking_time, message, check_in_date, check_out_date, booking_status, total_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [userId, room_id, full_name, phone, email, check_in_date, bookingTime, message, check_in_date, check_out_date, 'reserved', totalPrice, 'pending']
        );

        const newBooking = result.rows[0];
        
        // Send confirmation email (non-blocking)
        if (email) {
            const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [room_id]);
            sendBookingConfirmation(newBooking, roomResult.rows[0]).catch(err => 
                console.error('Failed to send confirmation email:', err)
            );
        }

        res.status(201).json({ message: 'Booking submitted successfully', booking: newBooking });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.session.user || (req.session.user.role !== 'admin' && req.session.user.role !== 'main_admin')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Simple signup - first user becomes main_admin
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Check if email exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Check if any users exist - first user is main_admin
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const isFirstUser = parseInt(userCount.rows[0].count) === 0;
        const role = isFirstUser ? 'main_admin' : 'user';
        
        const result = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
            [name, email, hashedPassword, role]
        );
        
        const newUser = result.rows[0];
        req.session.user = newUser;
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
            }
        });
        
        res.json({ 
            message: isFirstUser ? 'Admin account created!' : 'Account created!',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Image upload endpoint (admin only)
app.post('/api/upload', requireAdmin, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ error: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        // Return the URL path to the uploaded file
        const imageUrl = '/uploads/' + req.file.filename;
        res.json({ success: true, imageUrl });
    });
});

// Simple login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        req.session.user = user;
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
            }
        });
        res.json({ 
            message: 'Login successful', 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email,
                role: user.role
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check auth
app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Check admin auth
app.get('/api/admin/check', (req, res) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'main_admin')) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

// General logout (for any user)
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

// Complete admin reset - clears and creates fresh admin with your email
app.post('/api/admin/setup-fresh', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Delete all existing users
        await pool.query('DELETE FROM users');
        
        // Create fresh admin user with your email
        await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
            ['Giddel Otabil', email, hashedPassword, 'main_admin']
        );
        
        res.json({ message: 'Admin created successfully', email: email });
    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Check admin auth
app.get('/api/admin/check', (req, res) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'main_admin')) {
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

// Get bookings for calendar view (admin)
app.get('/api/admin/bookings/calendar', requireAdmin, async (req, res) => {
    try {
        const { start, end } = req.query;
        
        let query = `
            SELECT 
                b.id,
                b.room_id,
                r.title as room_title,
                b.full_name as customer_name,
                b.check_in_date,
                b.check_out_date,
                b.booking_status
            FROM bookings b
            LEFT JOIN rooms r ON b.room_id = r.id
            WHERE b.booking_status != 'cancelled'
        `;
        
        const params = [];
        
        if (start && end) {
            query += ` AND b.check_out_date >= $1 AND b.check_in_date <= $2`;
            params.push(start, end);
        }
        
        query += ` ORDER BY b.check_in_date`;
        
        const result = await pool.query(query, params);
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

// Check-in guest (admin)
app.patch('/api/admin/bookings/:id/checkin', requireAdmin, async (req, res) => {
    try {
        // Get booking details before updating
        const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        
        if (bookingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        await pool.query(
            "UPDATE bookings SET booking_status = 'checked_in', status = 'confirmed' WHERE id = $1",
            [req.params.id]
        );
        
        // Send check-in email (non-blocking)
        const bookingData = bookingResult.rows[0];
        if (bookingData.email) {
            const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [bookingData.room_id]);
            sendCheckInEmail(bookingData, roomResult.rows[0]).catch(err => 
                console.error('Failed to send check-in email:', err)
            );
        }
        
        res.json({ message: 'Guest checked in successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check-out guest (admin)
app.patch('/api/admin/bookings/:id/checkout', requireAdmin, async (req, res) => {
    try {
        await pool.query(
            "UPDATE bookings SET booking_status = 'checked_out', status = 'completed' WHERE id = $1",
            [req.params.id]
        );
        res.json({ message: 'Guest checked out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel booking (admin and user)
app.patch('/api/bookings/:id/cancel', async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        // Check if user owns the booking or is admin
        const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
        
        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        
        const isAdmin = req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'main_admin');
        const isOwner = req.session.user && booking.rows[0].user_id === req.session.user.id;
        
        if (!isAdmin && !isOwner) {
            return res.status(401).json({ error: 'Unauthorized to cancel this booking' });
        }
        
        // Check business rule: prevent cancellation within 24 hours of check-in
        const checkInDate = new Date(booking.rows[0].check_in_date);
        const now = new Date();
        const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
        
        if (hoursUntilCheckIn < 24 && hoursUntilCheckIn > 0) {
            return res.status(400).json({ error: 'Cannot cancel within 24 hours of check-in. Please contact the hotel directly.' });
        }
        
        // Update booking status to cancelled
        await pool.query(
            "UPDATE bookings SET booking_status = 'cancelled', status = 'cancelled' WHERE id = $1",
            [bookingId]
        );
        
        // Send cancellation email (non-blocking)
        const bookingData = booking.rows[0];
        if (bookingData.email) {
            const roomResult = await pool.query('SELECT * FROM rooms WHERE id = $1', [bookingData.room_id]);
            sendCancellationEmail(bookingData, roomResult.rows[0]).catch(err => 
                console.error('Failed to send cancellation email:', err)
            );
        }
        
        res.json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available rooms
app.get('/api/rooms/available', async (req, res) => {
    try {
        const { checkIn, checkOut } = req.query;
        
        if (!checkIn || !checkOut) {
            return res.status(400).json({ error: 'Check-in and check-out dates are required' });
        }
        
        const query = `
            SELECT * FROM rooms r
            WHERE r.status = 'available'
            AND NOT EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.room_id = r.id
                  AND b.booking_status != 'cancelled'
                  AND b.booking_status != 'checked_out'
                  AND b.check_in_date < $2
                  AND b.check_out_date > $1
            )
        `;
        
        const result = await pool.query(query, [checkIn, checkOut]);
        res.json(result.rows);
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
        const { title, description, price, amenities, status, image_url, rating, review_count, beds, baths, guests, size, location } = req.body;
        const result = await pool.query(
            `INSERT INTO rooms (title, description, price, amenities, status, image_url, rating, review_count, beds, baths, guests, size, location) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [title, description, price, amenities, status || 'available', image_url, 
             rating || 0, review_count || 0, beds || 1, 
             baths || 1, guests || 2, size || 25, location]
        );
        res.status(201).json({ message: 'Room created successfully', room: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update room (admin)
app.put('/api/admin/rooms/:id', requireAdmin, async (req, res) => {
    try {
        const { title, description, price, amenities, status, image_url, rating, review_count, beds, baths, guests, size, location } = req.body;
        await pool.query(
            `UPDATE rooms SET title = $1, description = $2, price = $3, amenities = $4, status = $5, image_url = $6, 
             rating = $7, review_count = $8, beds = $9, baths = $10, guests = $11, size = $12, location = $13 WHERE id = $14`,
            [title, description, price, amenities, status, image_url, 
             rating || 0, review_count || 0, beds || 1, baths || 1, guests || 2, size || 25, location, req.params.id]
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

// Get dining items (public)
app.get('/api/dining', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dining_items ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get discover items (public)
app.get('/api/discover', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM discover_items ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update settings (admin)
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
        const { hotel_name, hotel_tagline, hotel_phone, hotel_email, hotel_address, hero_title, hero_text, hero_image, about_title, about_text, about_image, checkin_time, checkout_time, front_desk_hours, copyright_year, company_name, rooms_hero_title, rooms_hero_text, rooms_hero_image, discover_hero_title, discover_hero_text, discover_hero_image, dining_hero_title, dining_hero_text, dining_hero_image, contact_hero_title, contact_hero_text, contact_hero_image } = req.body;
        
        await pool.query(`
            UPDATE settings SET 
                hotel_name = $1, hotel_tagline = $2, hotel_phone = $3, 
                hotel_email = $4, hotel_address = $5, hero_title = $6, hero_text = $7, hero_image = $8,
                about_title = $9, about_text = $10, about_image = $11, checkin_time = $12, 
                checkout_time = $13, front_desk_hours = $14, copyright_year = $15, company_name = $16,
                rooms_hero_title = $17, rooms_hero_text = $18, rooms_hero_image = $19,
                discover_hero_title = $20, discover_hero_text = $21, discover_hero_image = $22,
                dining_hero_title = $23, dining_hero_text = $24, dining_hero_image = $25,
                contact_hero_title = $26, contact_hero_text = $27, contact_hero_image = $28,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = 1`,
            [hotel_name, hotel_tagline, hotel_phone, hotel_email, hotel_address, 
             hero_title, hero_text, hero_image, about_title, about_text, about_image, 
             checkin_time, checkout_time, front_desk_hours, copyright_year, company_name,
             rooms_hero_title, rooms_hero_text, rooms_hero_image,
             discover_hero_title, discover_hero_text, discover_hero_image,
             dining_hero_title, dining_hero_text, dining_hero_image,
             contact_hero_title, contact_hero_text, contact_hero_image]
        );
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== NEW ADMIN API ENDPOINTS ==========

// Get overview sections (admin)
app.get('/api/admin/overview-sections', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM overview_sections ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update overview section
app.put('/api/admin/overview-sections/:key', requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { title, description, image_url, is_visible } = req.body;
        
        await pool.query(`
            UPDATE overview_sections 
            SET title = $1, description = $2, image_url = $3, is_visible = $4, updated_at = CURRENT_TIMESTAMP
            WHERE section_key = $5
        `, [title, description, image_url, is_visible, key]);
        
        res.json({ message: 'Section updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get discover items (admin)
app.get('/api/admin/discover', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM discover_items ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add discover item
app.post('/api/admin/discover', requireAdmin, async (req, res) => {
    try {
        const { title, description, image_url, is_visible } = req.body;
        const maxOrder = await pool.query('SELECT MAX(display_order) as max FROM discover_items');
        const newOrder = (maxOrder.rows[0].max || 0) + 1;
        
        const result = await pool.query(`
            INSERT INTO discover_items (title, description, image_url, display_order, is_visible)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [title, description, image_url, newOrder, is_visible !== false]);
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update discover item
app.put('/api/admin/discover/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, display_order, is_visible } = req.body;
        
        await pool.query(`
            UPDATE discover_items 
            SET title = $1, description = $2, image_url = $3, display_order = $4, is_visible = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `, [title, description, image_url, display_order, is_visible, id]);
        
        res.json({ message: 'Item updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete discover item
app.delete('/api/admin/discover/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM discover_items WHERE id = $1', [id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get discover items (public)
app.get('/api/discover', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM discover_items ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dining items (admin)
app.get('/api/admin/dining', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dining_items ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add dining item
app.post('/api/admin/dining', requireAdmin, async (req, res) => {
    try {
        const { title, description, image_url, opening_hours, price_range, is_visible } = req.body;
        const maxOrder = await pool.query('SELECT MAX(display_order) as max FROM dining_items');
        const newOrder = (maxOrder.rows[0].max || 0) + 1;
        
        const result = await pool.query(`
            INSERT INTO dining_items (title, description, image_url, opening_hours, price_range, display_order, is_visible)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
        `, [title, description, image_url, opening_hours, price_range, newOrder, is_visible !== false]);
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update dining item
app.put('/api/admin/dining/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, opening_hours, price_range, display_order, is_visible } = req.body;
        
        await pool.query(`
            UPDATE dining_items 
            SET title = $1, description = $2, image_url = $3, opening_hours = $4, price_range = $5, display_order = $6, is_visible = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
        `, [title, description, image_url, opening_hours, price_range, display_order, is_visible, id]);
        
        res.json({ message: 'Item updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete dining item
app.delete('/api/admin/dining/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM dining_items WHERE id = $1', [id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get contact settings (admin)
app.get('/api/admin/contact', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM contact_settings WHERE id = 1');
        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update contact settings
app.put('/api/admin/contact', requireAdmin, async (req, res) => {
    try {
        const { phone, email, address, map_link, live_chat_enabled, contact_form_email, facebook_link, instagram_link, twitter_link, whatsapp } = req.body;
        
        await pool.query(`
            UPDATE contact_settings 
            SET phone = $1, email = $2, address = $3, map_link = $4, live_chat_enabled = $5, 
                contact_form_email = $6, facebook_link = $7, instagram_link = $8, twitter_link = $9, 
                whatsapp = $10, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [phone, email, address, map_link, live_chat_enabled, contact_form_email, facebook_link, instagram_link, twitter_link, whatsapp]);
        
        res.json({ message: 'Contact settings updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get media library (admin)
app.get('/api/admin/media', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM media_library ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Upload media (admin)
app.post('/api/admin/media', requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const filePath = '/uploads/' + req.file.filename;
        
        const result = await pool.query(`
            INSERT INTO media_library (filename, original_name, file_path, file_size, mime_type)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [req.file.filename, req.file.originalname, filePath, req.file.size, req.file.mimetype]);
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete media
app.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const media = await pool.query('SELECT * FROM media_library WHERE id = $1', [id]);
        
        if (media.rows.length > 0) {
            const filePath = path.join(__dirname, 'uploads', media.rows[0].filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await pool.query('DELETE FROM media_library WHERE id = $1', [id]);
        }
        
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const rooms = await pool.query('SELECT COUNT(*) as total FROM rooms');
        const bookings = await pool.query('SELECT COUNT(*) as total FROM bookings');
        const media = await pool.query('SELECT COUNT(*) as total FROM media_library');
        const sections = await pool.query('SELECT COUNT(*) as total FROM overview_sections');
        
        res.json({
            totalRooms: parseInt(rooms.rows[0].total),
            totalBookings: parseInt(bookings.rows[0].total),
            totalMedia: parseInt(media.rows[0].total),
            totalSections: parseInt(sections.rows[0].total)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User middleware - requires authenticated user (not admin)
function requireUser(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Get current user profile
app.get('/api/user/profile', requireUser, async (req, res) => {
    try {
        const user = req.session.user;
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.created_at
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
app.put('/api/user/profile', requireUser, async (req, res) => {
    try {
        const { name, email } = req.body;
        const userId = req.session.user.id;
        
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role',
            [name, email, userId]
        );
        
        // Update session
        req.session.user = { ...req.session.user, name, email };
        
        res.json({ message: 'Profile updated', user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user bookings
app.get('/api/user/bookings', requireUser, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const result = await pool.query(`
            SELECT b.*, r.title as room_title, r.image_url as room_image
            FROM bookings b 
            LEFT JOIN rooms r ON b.room_id = r.id 
            WHERE b.user_id = $1
            ORDER BY b.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User logout
app.post('/api/user/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logout successful' });
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Hotel Booking System running on http://localhost:${PORT}`);
});
