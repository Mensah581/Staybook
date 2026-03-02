const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

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
const db = new sqlite3.Database('./hotel.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create rooms table
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        amenities TEXT,
        status TEXT DEFAULT 'available',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create room_images table
    db.run(`CREATE TABLE IF NOT EXISTS room_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )`);

    // Create bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        booking_time TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )`);

    // Create settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        hotel_name TEXT DEFAULT 'Grand Hotel',
        hotel_tagline TEXT DEFAULT 'Luxury Accommodations',
        hotel_phone TEXT DEFAULT '+1 234 567 890',
        hotel_email TEXT DEFAULT 'info@grandhotel.com',
        hotel_address TEXT DEFAULT '123 Hotel Street, City Center',
        hero_title TEXT DEFAULT 'Find Your Perfect Stay',
        hero_text TEXT DEFAULT 'Experience luxury and comfort at Grand Hotel. Book your dream room today.',
        about_title TEXT DEFAULT 'Welcome to Grand Hotel',
        about_text TEXT DEFAULT 'Experience world-class hospitality at Grand Hotel. Our commitment to quality service and guest satisfaction has made us a preferred choice for travelers. Whether you're here for business or leisure, we have the perfect room for your stay. Book your appointment today and experience the difference.',
        about_image TEXT DEFAULT 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
        checkin_time TEXT DEFAULT '2:00 PM',
        checkout_time TEXT DEFAULT '12:00 PM',
        front_desk_hours TEXT DEFAULT '24/7 Front Desk',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        // Insert default settings if not exists
        db.get('SELECT * FROM settings WHERE id = 1', (err, setting) => {
            if (!setting) {
                db.run('INSERT INTO settings (id, hotel_name, copyright_year, company_name) VALUES (1, ?, ?, ?)', ['Grand Hotel', new Date().getFullYear(), 'Grand Hotel']);
            }
        });
    });

    // Create default admin user if not exists
    const adminEmail = 'admin@hotel.com';
    db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, user) => {
        if (!user) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', 
                ['Administrator', adminEmail, hashedPassword, 'admin']);
            console.log('Default admin created: admin@hotel.com / admin123');
        }
    });

    console.log('Database initialized - rooms must be added by admin');
}

// ==================== PUBLIC ROUTES ====================

// Get all rooms
app.get('/api/rooms', (req, res) => {
    db.all('SELECT * FROM rooms ORDER BY created_at DESC', [], (err, rooms) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Get images for each room
        const getImages = rooms.map(room => {
            return new Promise((resolve) => {
                db.all('SELECT image_url FROM room_images WHERE room_id = ?', [room.id], (err, images) => {
                    room.images = images.map(img => img.image_url);
                    resolve(room);
                });
            });
        });

        Promise.all(getImages).then(roomsWithImages => {
            res.json(roomsWithImages);
        });
    });
});

// Get single room details
app.get('/api/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
        if (err || !room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        db.all('SELECT image_url FROM room_images WHERE room_id = ?', [roomId], (err, images) => {
            room.images = images.map(img => img.image_url);
            res.json(room);
        });
    });
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const { room_id, full_name, phone, email, booking_date, booking_time, message } = req.body;

    // Validate required fields
    if (!room_id || !full_name || !phone || !email || !booking_date || !booking_time) {
        return res.status(400).json({ error: 'All required fields must be filled' });
    }

    // Check if room exists and is available
    db.get('SELECT * FROM rooms WHERE id = ? AND status = ?', [room_id, 'available'], (err, room) => {
        if (err || !room) {
            return res.status(400).json({ error: 'Room not available for booking' });
        }

        // Check if date is not in the past
        const today = new Date().toISOString().split('T')[0];
        if (booking_date < today) {
            return res.status(400).json({ error: 'Booking date cannot be in the past' });
        }

        // Create booking
        db.run(`INSERT INTO bookings (room_id, full_name, phone, email, booking_date, booking_time, message, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [room_id, full_name, phone, email, booking_date, booking_time, message || ''],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Booking submitted successfully!', booking_id: this.lastID });
            });
    });
});

// ==================== ADMIN ROUTES ====================

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin'], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.adminId = user.id;
        req.session.adminRole = user.role;
        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
    });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// Check admin session
app.get('/api/admin/check', (req, res) => {
    if (req.session.adminId) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

// Middleware to check admin authentication
function requireAdmin(req, res, next) {
    if (!req.session.adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Get all bookings (admin)
app.get('/api/admin/bookings', requireAdmin, (req, res) => {
    const query = `
        SELECT b.*, r.title as room_title, r.price as room_price
        FROM bookings b
        LEFT JOIN rooms r ON b.room_id = r.id
        ORDER BY b.created_at DESC
    `;
    db.all(query, [], (err, bookings) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(bookings);
    });
});

// Update booking status (admin)
app.put('/api/admin/bookings/:id', requireAdmin, (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'approved', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Booking status updated' });
    });
});

// Get all rooms (admin)
app.get('/api/admin/rooms', requireAdmin, (req, res) => {
    db.all('SELECT * FROM rooms ORDER BY created_at DESC', [], (err, rooms) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const getImages = rooms.map(room => {
            return new Promise((resolve) => {
                db.all('SELECT image_url FROM room_images WHERE room_id = ?', [room.id], (err, images) => {
                    room.images = images.map(img => img.image_url);
                    resolve(room);
                });
            });
        });

        Promise.all(getImages).then(roomsWithImages => {
            res.json(roomsWithImages);
        });
    });
});

// Add room (admin)
app.post('/api/admin/rooms', requireAdmin, (req, res) => {
    const { title, description, price, amenities, status } = req.body;
    
    if (!title || !price) {
        return res.status(400).json({ error: 'Title and price are required' });
    }

    db.run('INSERT INTO rooms (title, description, price, amenities, status) VALUES (?, ?, ?, ?, ?)',
        [title, description || '', price, amenities || '', status || 'available'],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Room added successfully', room_id: this.lastID });
        });
});

// Update room (admin)
app.put('/api/admin/rooms/:id', requireAdmin, (req, res) => {
    const roomId = req.params.id;
    const { title, description, price, amenities, status } = req.body;

    db.run(`UPDATE rooms SET title = ?, description = ?, price = ?, amenities = ?, status = ? WHERE id = ?`,
        [title, description, price, amenities, status, roomId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Room updated successfully' });
        });
});

// Delete room (admin)
app.delete('/api/admin/rooms/:id', requireAdmin, (req, res) => {
    const roomId = req.params.id;
    
    db.run('DELETE FROM room_images WHERE room_id = ?', [roomId], (err) => {
        db.run('DELETE FROM rooms WHERE id = ?', [roomId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Room deleted successfully' });
        });
    });
});

// Add room image (admin)
app.post('/api/admin/rooms/:id/images', requireAdmin, upload.single('image'), (req, res) => {
    const roomId = req.params.id;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const imageUrl = '/uploads/' + req.file.filename;
    db.run('INSERT INTO room_images (room_id, image_url) VALUES (?, ?)', [roomId, imageUrl], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Image added successfully', image_url: imageUrl });
    });
});

// Delete room image (admin)
app.delete('/api/admin/rooms/:roomId/images/:imageId', requireAdmin, (req, res) => {
    const imageId = req.params.imageId;
    
    db.run('DELETE FROM room_images WHERE id = ?', [imageId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Image deleted successfully' });
    });
});

// Get booking statistics (admin)
app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const stats = {};
    
    db.get('SELECT COUNT(*) as total FROM bookings', [], (err, result) => {
        stats.totalBookings = result ? result.total : 0;
        
        db.get('SELECT COUNT(*) as total FROM rooms', [], (err, result) => {
            stats.totalRooms = result ? result.total : 0;
            
            db.get("SELECT COUNT(*) as total FROM bookings WHERE status = 'pending'", [], (err, result) => {
                stats.pendingBookings = result ? result.total : 0;
                
                db.get("SELECT COUNT(*) as total FROM bookings WHERE status = 'approved'", [], (err, result) => {
                    stats.approvedBookings = result ? result.total : 0;
                    res.json(stats);
                });
            });
        });
    });
});

// Get settings (public)
app.get('/api/settings', (req, res) => {
    db.get('SELECT * FROM settings WHERE id = 1', (err, setting) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(setting || { hotel_name: 'Grand Hotel' });
    });
});

// Update settings (admin)
app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const { hotel_name, hotel_tagline, hotel_phone, hotel_email, hotel_address, hero_title, hero_text, about_title, about_text, about_image, checkin_time, checkout_time, front_desk_hours, copyright_year, company_name } = req.body;
    
    db.run(`UPDATE settings SET hotel_name = ?, hotel_tagline = ?, hotel_phone = ?, 
            hotel_email = ?, hotel_address = ?, hero_title = ?, hero_text = ?, 
            about_title = ?, about_text = ?, about_image = ?, checkin_time = ?, 
            checkout_time = ?, front_desk_hours = ?, copyright_year = ?, company_name = ?, 
            updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [hotel_name, hotel_tagline, hotel_phone, hotel_email, hotel_address, 
         hero_title, hero_text, about_title, about_text, about_image, 
         checkin_time, checkout_time, front_desk_hours, copyright_year, company_name],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message});
            }
            res.json({ message: 'Settings updated successfully' });
        });
});

// Start server
app.listen(PORT, () => {
    console.log(`Hotel Booking System running on http://localhost:${PORT}`);
});
