// Customer Portal JavaScript

const API_URL = '/api';
let currentUser = null;
let selectedRoom = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();
  setupEventListeners();
  loadRooms();
  loadUserBookings();
  loadUserProfile();
});

// Check if user is authenticated
async function checkAuthentication() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      window.location.href = '/pages/login.html';
      return;
    }
    
    const data = await response.json();
    currentUser = data.data;
    updateNavbar();
  } catch (error) {
    console.error('Auth check failed:', error);
    window.location.href = '/pages/login.html';
  }
}

// Update navbar with user info
function updateNavbar() {
  if (currentUser) {
    const navMenu = document.querySelector('.nav-menu');
    const userGreeting = document.querySelector('.nav-link[href="#profile"]');
    if (userGreeting) {
      userGreeting.textContent = `${currentUser.full_name || 'Profile'}`;
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  // Section navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.id !== 'logout-btn') {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('href').substring(1);
        showSection(target);
      });
    }
  });

  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Quick booking
  const quickBookingForm = document.getElementById('quick-booking-form');
  if (quickBookingForm) {
    quickBookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const checkin = document.getElementById('quick-checkin').value;
      const checkout = document.getElementById('quick-checkout').value;
      const guests = document.getElementById('quick-guests').value;
      
      document.getElementById('filter-checkin').value = checkin;
      document.getElementById('filter-checkout').value = checkout;
      searchRooms(checkin, checkout, guests);
      showSection('rooms');
    });
  }

  // Room filters
  const applyFiltersBtn = document.getElementById('apply-filters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      const checkin = document.getElementById('filter-checkin').value;
      const checkout = document.getElementById('filter-checkout').value;
      const maxPrice = document.getElementById('filter-price').value;
      searchRooms(checkin, checkout, maxPrice);
    });
  }

  // Price range slider
  const priceSlider = document.getElementById('filter-price');
  if (priceSlider) {
    priceSlider.addEventListener('change', (e) => {
      document.getElementById('price-display').textContent = `$${e.target.value}`;
    });
  }

  // Profile form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', updateProfile);
  }

  // Booking form
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', submitBooking);
  }

  // Payment form
  const paymentForm = document.getElementById('payment-form');
  if (paymentForm) {
    paymentForm.addEventListener('submit', submitPayment);
  }

  // Payment method change
  const paymentMethod = document.getElementById('payment-method');
  if (paymentMethod) {
    paymentMethod.addEventListener('change', (e) => {
      const cardFields = document.getElementById('card-fields');
      if (e.target.value === 'card') {
        cardFields.style.display = 'block';
      } else {
        cardFields.style.display = 'none';
      }
    });
  }

  // Modal close buttons
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('show');
    });
  });

  // Close modals on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
}

// Show section
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    window.scrollTo(0, 0);
  }
}

// Scroll to section (helper)
function scrollToSection(sectionId) {
  showSection(sectionId);
}

// Load rooms
async function loadRooms() {
  try {
    showSpinner(true);
    const response = await fetch(`${API_URL}/rooms`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayRooms(data.data);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    console.error('Error loading rooms:', error);
    showToast('Failed to load rooms', 'error');
  } finally {
    showSpinner(false);
  }
}

// Search rooms with filters
async function searchRooms(checkin, checkout, maxPrice = null) {
  try {
    showSpinner(true);
    let url = `${API_URL}/rooms?`;
    
    if (checkin && checkout) {
      url += `check_in_date=${checkin}&check_out_date=${checkout}&`;
    }
    
    if (maxPrice) {
      url += `max_price=${maxPrice}`;
    }
    
    const response = await fetch(url, {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayRooms(data.data);
      showToast('Rooms loaded successfully', 'success');
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    console.error('Error searching rooms:', error);
    showToast('Failed to search rooms', 'error');
  } finally {
    showSpinner(false);
  }
}

// Display rooms
function displayRooms(rooms) {
  const container = document.getElementById('rooms-container');
  
  if (!rooms || rooms.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div><i class="fas fa-inbox"></i></div>
        <p>No rooms available for the selected dates</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = rooms.map(room => `
    <div class="room-card" onclick="openRoomDetails(${room.id})">
      <img class="room-image" src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop" alt="${room.title}">
      <div class="room-body">
        <h3>${room.title}</h3>
        <p>${room.description.substring(0, 80)}...</p>
        <div class="room-specs">
          <span><i class="fas fa-bed"></i> ${room.bedrooms} Bedrooms</span>
          <span><i class="fas fa-bath"></i> ${room.bathrooms} Bathrooms</span>
          <span><i class="fas fa-users"></i> ${room.max_guests} Guests</span>
        </div>
        <div class="room-footer">
          <div class="room-price">$${room.price}</div>
          <button class="btn btn-primary btn-sm" onclick="openBookingForm(event, ${room.id})">Book</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Open room details modal
function openRoomDetails(roomId) {
  const rooms = document.querySelectorAll('.room-card');
  selectedRoom = Array.from(rooms).find(card => {
    const bookBtn = card.querySelector('button');
    return bookBtn.onclick.toString().includes(`openBookingForm(event, ${roomId})`);
  });
  
  // For simplicity, just fetch the room and show details
  fetch(`${API_URL}/rooms/${roomId}`, { credentials: 'include' })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        const room = data.data;
        selectedRoom = room;
        
        document.getElementById('modal-room-image').src = 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&h=400&fit=crop';
        document.getElementById('modal-room-title').textContent = room.title;
        document.getElementById('modal-room-description').textContent = room.description;
        document.getElementById('modal-bedrooms').textContent = room.bedrooms;
        document.getElementById('modal-bathrooms').textContent = room.bathrooms;
        document.getElementById('modal-max-guests').textContent = room.max_guests;
        document.getElementById('modal-room-price').textContent = `$${room.price} per night`;
        
        const amenitiesList = document.getElementById('modal-amenities');
        if (Array.isArray(room.amenities)) {
          amenitiesList.innerHTML = room.amenities.map(a => `<li>${a}</li>`).join('');
        } else {
          amenitiesList.innerHTML = '<li>WiFi</li><li>AC</li><li>TV</li>';
        }
        
        document.getElementById('room-modal').classList.add('show');
      }
    });
}

// Open booking form
function openBookingForm(event, roomId) {
  event.stopPropagation();
  selectedRoom = { id: roomId };
  document.getElementById('booking-room-id').value = roomId;
  document.getElementById('booking-modal').classList.add('show');
}

// Submit booking
async function submitBooking(e) {
  e.preventDefault();
  
  const roomId = document.getElementById('booking-room-id').value;
  const checkin = document.getElementById('booking-checkin').value;
  const checkout = document.getElementById('booking-checkout').value;
  const guests = document.getElementById('booking-guests').value;
  const requests = document.getElementById('booking-requests').value;
  
  if (!currentUser || !currentUser.id) {
    showToast('Please log in to make a booking', 'error');
    return;
  }
  
  try {
    showSpinner(true);
    
    const response = await fetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        customer_id: currentUser.id,
        room_id: parseInt(roomId),
        check_in_date: checkin,
        check_out_date: checkout,
        number_of_guests: parseInt(guests),
        special_requests: requests
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const booking = data.data;
      document.getElementById('booking-modal').classList.remove('show');
      openPaymentModal(booking);
      showToast('Booking created. Please proceed with payment.', 'success');
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    console.error('Error submitting booking:', error);
    showToast('Failed to create booking', 'error');
  } finally {
    showSpinner(false);
  }
}

// Open payment modal
function openPaymentModal(booking) {
  document.getElementById('payment-booking-id').value = booking.id;
  
  const summary = document.getElementById('payment-summary');
  summary.innerHTML = `
    <div><span>Booking ID:</span> <strong>#${booking.id}</strong></div>
    <div><span>Check-in:</span> <strong>${new Date(booking.check_in_date).toLocaleDateString()}</strong></div>
    <div><span>Check-out:</span> <strong>${new Date(booking.check_out_date).toLocaleDateString()}</strong></div>
    <div><span>Guests:</span> <strong>${booking.number_of_guests}</strong></div>
    <div class="total"><span>Total Amount:</span> <strong>$${booking.total_amount}</strong></div>
  `;
  
  document.getElementById('payment-modal').classList.add('show');
}

// Submit payment
async function submitPayment(e) {
  e.preventDefault();
  
  const bookingId = document.getElementById('payment-booking-id').value;
  const method = document.getElementById('payment-method').value;
  
  if (!method) {
    showToast('Please select a payment method', 'error');
    return;
  }
  
  try {
    showSpinner(true);
    
    // Get booking details for amount
    const bookingRes = await fetch(`${API_URL}/bookings/${bookingId}`, { credentials: 'include' });
    const bookingData = await bookingRes.json();
    
    if (!bookingData.success) {
      throw new Error('Booking not found');
    }
    
    const booking = bookingData.data;
    
    const response = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        booking_id: parseInt(bookingId),
        amount: booking.total_amount,
        payment_method: method,
        status: 'pending'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      document.getElementById('payment-modal').classList.remove('show');
      showSuccessModal(booking);
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    console.error('Error submitting payment:', error);
    showToast('Failed to process payment', 'error');
  } finally {
    showSpinner(false);
  }
}

// Show success modal
function showSuccessModal(booking) {
  document.getElementById('success-message').textContent = `Your booking is confirmed! Your reservation has been saved.`;
  
  const reference = document.getElementById('booking-reference');
  reference.innerHTML = `
    <div><strong>Booking Reference:</strong> #${booking.id}</div>
    <div><strong>Check-in:</strong> ${new Date(booking.check_in_date).toLocaleDateString()}</div>
    <div><strong>Check-out:</strong> ${new Date(booking.check_out_date).toLocaleDateString()}</div>
    <div><strong>Total Amount:</strong> $${booking.total_amount}</div>
  `;
  
  document.getElementById('success-modal').classList.add('show');
}

// Load user bookings
async function loadUserBookings() {
  try {
    if (!currentUser) return;
    
    const response = await fetch(`${API_URL}/customers/${currentUser.id}/bookings`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      displayBookings(data.data);
    }
  } catch (error) {
    console.error('Error loading bookings:', error);
  }
}

// Display bookings
function displayBookings(bookings) {
  const container = document.getElementById('bookings-container');
  
  if (!bookings || bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div><i class="fas fa-calendar-times"></i></div>
        <p>No bookings yet. <a href="#rooms">Book a room now</a></p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = bookings.map(booking => `
    <div class="booking-card">
      <div class="booking-header">
        <div class="booking-id">Booking #${booking.id}</div>
        <span class="booking-status status-${booking.status}">${booking.status.toUpperCase()}</span>
      </div>
      <div class="booking-details">
        <div class="detail-row">
          <span class="detail-label">Room:</span>
          <span class="detail-value">${booking.room_title || 'Room'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-in:</span>
          <span class="detail-value">${new Date(booking.check_in_date).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Check-out:</span>
          <span class="detail-value">${new Date(booking.check_out_date).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Guests:</span>
          <span class="detail-value">${booking.number_of_guests}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Total:</span>
          <span class="detail-value">$${booking.total_amount}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment:</span>
          <span class="detail-value">${booking.payment_status || 'PENDING'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Load user profile
async function loadUserProfile() {
  if (!currentUser) return;
  
  document.getElementById('profile-name').value = currentUser.full_name || '';
  document.getElementById('profile-email').value = currentUser.email || '';
  document.getElementById('profile-phone').value = currentUser.phone || '';
  document.getElementById('profile-address').value = currentUser.address || '';
  document.getElementById('profile-city').value = currentUser.city || '';
  document.getElementById('profile-country').value = currentUser.country || '';
}

// Update profile
async function updateProfile(e) {
  e.preventDefault();
  
  // Since users table is different from customers, this would need adjustment
  alert('Profile update functionality to be implemented');
}

// Logout
async function logout(e) {
  e.preventDefault();
  
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    
    window.location.href = '/pages/login.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Utility functions
function showSpinner(show) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.style.display = show ? 'flex' : 'none';
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}
