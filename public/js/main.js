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
    const statusClass = room.status === 'available' ? 'available' : 'unavailable';
    const statusText = room.status === 'available' ? 'Available' : 'Not Available';
    const buttonText = room.status === 'available' ? 'View Details & Book' : 'View Details';
    
    return `
        <div class="room-card">
            <div class="room-image">
                <img src="${room.images && room.images[0] ? room.images[0] : 'https://picsum.photos/seed/room/400/300'}" 
                     alt="${room.title}">
                <span class="room-status ${statusClass}">${statusText}</span>
            </div>
            <div class="room-info">
                <h3>${room.title}</h3>
                <div class="room-price">$${room.price} <span>/ night</span></div>
                <p class="room-description">${room.description || 'No description available'}</p>
                <div class="room-amenities">
                    ${room.amenities ? room.amenities.split(',').slice(0, 3).map(a => 
                        `<span class="amenity-tag">${a.trim()}</span>`
                    ).join('') : ''}
                </div>
                <a href="/room-details.html?id=${room.id}" class="btn btn-primary" style="width: 100%; text-align: center;">
                    ${buttonText}
                </a>
            </div>
        </div>
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
