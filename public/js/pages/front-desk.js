// Front Desk Dashboard JavaScript

const API_URL = '/api';
let currentUser = null;
let allBookings = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthentication();
  setupEventListeners();
  updateClock();
  setInterval(updateClock, 1000);
  loadDashboardData();
});

// Check authentication
async function checkAuthentication() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
    
    if (!response.ok) {
      window.location.href = '/pages/login.html';
      return;
    }
    
    const data = await response.json();
    currentUser = data.data;
    
    // Check if user is front_desk or admin
    if (!['front_desk', 'admin', 'main_admin'].includes(currentUser.role)) {
      window.location.href = '/pages/login.html';
      return;
    }
    
    document.getElementById('user-name').textContent = currentUser.full_name || 'Staff';
  } catch (error) {
    window.location.href = '/pages/login.html';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      showSection(section);
      
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Booking filters
  document.getElementById('booking-search').addEventListener('input', filterBookings);
  document.getElementById('booking-status').addEventListener('change', filterBookings);

  // Modal closes
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.modal').classList.remove('show');
    });
  });

  // Forms
  document.getElementById('checkin-form').addEventListener('submit', submitCheckIn);
  document.getElementById('checkout-form').addEventListener('submit', submitCheckOut);
}

// Update clock
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  document.getElementById('current-time').textContent = timeStr;
}

// Show section
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  if (sectionId === 'checkins') loadCheckIns();
  if (sectionId === 'checkouts') loadCheckOuts();
  if (sectionId === 'bookings') loadAllBookings();
  if (sectionId === 'rooms') loadRoomStatus();
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const [checkinsRes, checkoutsRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/bookings/checkins/today`, { credentials: 'include' }),
      fetch(`${API_URL}/bookings/checkouts/today`, { credentials: 'include' }),
      fetch(`${API_URL}/rooms/stats`, { credentials: 'include' })
    ]);

    const [checkinsData, checkoutsData, statsData] = await Promise.all([
      checkinsRes.json(),
      checkoutsRes.json(),
      statsRes.json()
    ]);

    // Update stats
    document.getElementById('today-checkins').textContent = checkinsData.data?.length || 0;
    document.getElementById('today-checkouts').textContent = checkoutsData.data?.length || 0;
    document.getElementById('occupied-rooms').textContent = statsData.data?.occupied || 0;
    document.getElementById('available-rooms').textContent = statsData.data?.available || 0;

    // Display upcoming check-ins
    const upcomingCheckins = document.getElementById('upcoming-checkins');
    if (checkinsData.data?.length > 0) {
      upcomingCheckins.innerHTML = checkinsData.data.slice(0, 5).map(b => `
        <div class="list-item">
          <strong>${b.customer_name}</strong>
          Room: ${b.room_title}<br>
          Guests: ${b.number_of_guests}
        </div>
      `).join('');
    } else {
      upcomingCheckins.innerHTML = '<div class="list-item empty">No check-ins today</div>';
    }

    // Display upcoming check-outs
    const upcomingCheckouts = document.getElementById('upcoming-checkouts');
    if (checkoutsData.data?.length > 0) {
      upcomingCheckouts.innerHTML = checkoutsData.data.slice(0, 5).map(b => `
        <div class="list-item">
          <strong>${b.customer_name}</strong>
          Room: ${b.room_title}<br>
          Guests: ${b.number_of_guests}
        </div>
      `).join('');
    } else {
      upcomingCheckouts.innerHTML = '<div class="list-item empty">No check-outs today</div>';
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load check-ins
async function loadCheckIns() {
  try {
    const response = await fetch(`${API_URL}/bookings/checkins/today`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      displayCheckIns(data.data);
    }
  } catch (error) {
    showToast('Failed to load check-ins', 'error');
  }
}

// Display check-ins
function displayCheckIns(bookings) {
  const tbody = document.getElementById('checkins-tbody');
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">No check-ins today</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>#${b.id}</td>
      <td>${b.customer_name}</td>
      <td>${b.customer_phone}</td>
      <td>${b.room_title}</td>
      <td>${b.number_of_guests}</td>
      <td>${b.check_in_date}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="openCheckInModal(${b.id}, '${b.customer_name}', '${b.room_title}', ${b.number_of_guests})">
          Check In
        </button>
      </td>
    </tr>
  `).join('');
}

// Load check-outs
async function loadCheckOuts() {
  try {
    const response = await fetch(`${API_URL}/bookings/checkouts/today`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      displayCheckOuts(data.data);
    }
  } catch (error) {
    showToast('Failed to load check-outs', 'error');
  }
}

// Display check-outs
function displayCheckOuts(bookings) {
  const tbody = document.getElementById('checkouts-tbody');
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">No check-outs today</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>#${b.id}</td>
      <td>${b.customer_name}</td>
      <td>${b.customer_phone}</td>
      <td>${b.room_title}</td>
      <td>${b.number_of_guests}</td>
      <td>${b.check_out_date}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="openCheckOutModal(${b.id}, '${b.customer_name}', '${b.room_title}')">
          Check Out
        </button>
      </td>
    </tr>
  `).join('');
}

// Load all bookings
async function loadAllBookings() {
  try {
    const response = await fetch(`${API_URL}/bookings`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      allBookings = data.data;
      displayAllBookings(allBookings);
    }
  } catch (error) {
    showToast('Failed to load bookings', 'error');
  }
}

// Display all bookings
function displayAllBookings(bookings) {
  const tbody = document.getElementById('bookings-tbody');
  
  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">No bookings</td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td>#${b.id}</td>
      <td>${b.customer_name}</td>
      <td>${b.room_title}</td>
      <td>${new Date(b.check_in_date).toLocaleDateString()}</td>
      <td>${new Date(b.check_out_date).toLocaleDateString()}</td>
      <td><span class="status-badge status-${b.status}">${b.status.toUpperCase()}</span></td>
      <td>
        <button class="btn btn-sm btn-success" onclick="viewBookingDetails(${b.id})">Details</button>
      </td>
    </tr>
  `).join('');
}

// Filter bookings
function filterBookings() {
  const search = document.getElementById('booking-search').value.toLowerCase();
  const status = document.getElementById('booking-status').value;

  const filtered = allBookings.filter(b => {
    const matchesSearch = b.id.toString().includes(search) || b.customer_name.toLowerCase().includes(search);
    const matchesStatus = !status || b.status === status;
    return matchesSearch && matchesStatus;
  });

  displayAllBookings(filtered);
}

// Open check-in modal
function openCheckInModal(bookingId, guestName, roomName, guests) {
  document.getElementById('checkin-booking-id').value = bookingId;
  document.getElementById('checkin-name').value = guestName;
  document.getElementById('checkin-room').value = roomName;
  document.getElementById('checkin-guests').value = guests;
  document.getElementById('checkin-modal').classList.add('show');
}

// Submit check-in
async function submitCheckIn(e) {
  e.preventDefault();

  const bookingId = document.getElementById('checkin-booking-id').value;

  try {
    const response = await fetch(`${API_URL}/bookings/${bookingId}/checkin`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('checkin-modal').classList.remove('show');
      showToast('Guest checked in successfully', 'success');
      loadDashboardData();
      loadCheckIns();
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to check in guest', 'error');
  }
}

// Open check-out modal
function openCheckOutModal(bookingId, guestName, roomName) {
  document.getElementById('checkout-booking-id').value = bookingId;
  document.getElementById('checkout-name').value = guestName;
  document.getElementById('checkout-room').value = roomName;
  document.getElementById('checkout-modal').classList.add('show');
}

// Submit check-out
async function submitCheckOut(e) {
  e.preventDefault();

  const bookingId = document.getElementById('checkout-booking-id').value;

  try {
    const response = await fetch(`${API_URL}/bookings/${bookingId}/checkout`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('checkout-modal').classList.remove('show');
      showToast('Guest checked out successfully', 'success');
      loadDashboardData();
      loadCheckOuts();
    } else {
      showToast(data.error, 'error');
    }
  } catch (error) {
    showToast('Failed to check out guest', 'error');
  }
}

// Load room status
async function loadRoomStatus() {
  try {
    const response = await fetch(`${API_URL}/rooms`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      const container = document.getElementById('rooms-container');
      container.innerHTML = data.data.map(room => `
        <div class="room-item">
          <div class="room-number">Room ${room.id}</div>
          <div style="font-size: 12px; color: #666; margin: 8px 0;">${room.title}</div>
          <div class="room-status status-${room.status}">${room.status.toUpperCase()}</div>
        </div>
      `).join('');
    }
  } catch (error) {
    showToast('Failed to load room status', 'error');
  }
}

// View booking details
function viewBookingDetails(bookingId) {
  alert(`Booking #${bookingId} details - Feature to be implemented`);
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

// Toast notification
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
  }, 3000);
}
