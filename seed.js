// Seed script - run this to populate the database with 10 hotel rooms
// Usage: node seed.js

const https = require('https');
const http = require('http');

// The seed endpoint URL - change this to your server URL
// For local: http://localhost:5000/api/seed-rooms
// For production: https://your-render-app.onrender.com/api/seed-rooms
const SEED_URL = process.argv[2] || 'https://staybook.onrender.com/api/seed-rooms';

console.log(`Seeding rooms to: ${SEED_URL}`);

const url = new URL(SEED_URL);
const protocol = url.protocol === 'https:' ? https : http;

const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = protocol.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response:', data);
        
        try {
            const json = JSON.parse(data);
            if (json.message) {
                console.log('✓ Success:', json.message);
            } else if (json.error) {
                console.error('✗ Error:', json.error);
            }
        } catch (e) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('✗ Request failed:', error.message);
    console.log('\nMake sure your server is running!');
    console.log('For local: node server.js then run: node seed.js http://localhost:5000/api/seed-rooms');
});

req.write(JSON.stringify({}));
req.end();

console.log('Sending seed request...');
