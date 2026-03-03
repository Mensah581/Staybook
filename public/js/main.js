// Main JavaScript for Hotel Booking System

// Utility functions
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    return messageDiv;
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// API helper functions
async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Room helper functions
function renderRoomCard(room) {
    const image = room.images && room.images[0] ? room.images[0] : 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400';
    
    return `
        <a href="/room-details.html?id=${room.id}" class="room-card" style="display:block;text-decoration:none;color:inherit;">
            <div class="room-image">
                <img src="${image}" alt="${room.title}">
            </div>
            <div class="room-info">
                <h3>${room.title}</h3>
                <p style="color:var(--text-secondary);font-size:0.9rem;">${room.location || 'Ghana'}</p>
                <p class="room-price">${room.price}<span>/night</span></p>
            </div>
        </a>
    `;
}

// Get URL parameters
function getURLParams() {
    return new URLSearchParams(window.location.search);
}

// Get single URL parameter
function getURLParam(name) {
    return getURLParams().get(name);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hotel Booking System loaded');
});
