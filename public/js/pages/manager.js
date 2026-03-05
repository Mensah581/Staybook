// Manager Dashboard JavaScript

const API_URL = '/api';
let currentUser = null;
let revenueChart = null;
let occupancyChart = null;
let revenueDetailChart = null;
let occupancyTrendChart = null;
let paymentMethodsChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  checkAuthentication();
  setupEventListeners();
  updateDate();
  loadDashboardData();
  setInterval(updateDate, 60000);
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
    
    // Check if user is manager or admin
    if (!['manager', 'admin', 'main_admin'].includes(currentUser.role)) {
      window.location.href = '/pages/login.html';
      return;
    }
    
    document.getElementById('user-name').textContent = currentUser.full_name || 'Manager';
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

  // Revenue period filter
  const revenuePeriod = document.getElementById('revenue-period');
  if (revenuePeriod) {
    revenuePeriod.addEventListener('change', () => {
      loadRevenueData();
    });
  }
}

// Update date
function updateDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('current-date').textContent = dateStr;
}

// Show section
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');

  if (sectionId === 'revenue') loadRevenueData();
  if (sectionId === 'occupancy') loadOccupancyData();
  if (sectionId === 'payments') loadPaymentData();
  if (sectionId === 'rooms') loadRoomsData();
}

// Load dashboard data
async function loadDashboardData() {
  try {
    const [bookingsRes, roomsRes, paymentsRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/bookings/stats`, { credentials: 'include' }),
      fetch(`${API_URL}/rooms/stats`, { credentials: 'include' }),
      fetch(`${API_URL}/payments/stats`, { credentials: 'include' }),
      fetch(`${API_URL}/admin/stats`, { credentials: 'include' })
    ]);

    const [bookingsData, roomsData, paymentsData, statsData] = await Promise.all([
      bookingsRes.json(),
      roomsRes.json(),
      paymentsRes.json(),
      statsRes.json()
    ]);

    // Update dashboard cards
    if (statsData.success) {
      document.getElementById('today-revenue').textContent = `GHS ${statsData.data.todayRevenue?.toFixed(2) || '0.00'}`;
      document.getElementById('occupancy-rate').textContent = `${statsData.data.occupancyRate || 0}%`;
      document.getElementById('total-bookings').textContent = statsData.data.totalBookings || 0;
      document.getElementById('total-rooms').textContent = statsData.data.totalRooms || 0;
      document.getElementById('occupied-rooms').textContent = statsData.data.occupiedRooms || 0;
      document.getElementById('available-rooms').textContent = statsData.data.availableRooms || 0;
    }

    if (bookingsData.success) {
      document.getElementById('today-checkins').textContent = bookingsData.data.todayCheckIns || 0;
      document.getElementById('today-checkouts').textContent = bookingsData.data.todayCheckOuts || 0;
    }

    // Load revenue chart for this week
    await loadRevenueChartData('week');
    
    // Load occupancy trend
    await loadOccupancyTrendData();
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load revenue chart data
async function loadRevenueChartData(period) {
  try {
    const response = await fetch(`${API_URL}/admin/analytics/revenue?period=${period}`, {
      credentials: 'include'
    });
    const data = await response.json();

    if (data.success) {
      const chartData = data.data;
      const labels = chartData.map(item => item.date);
      const revenues = chartData.map(item => item.revenue);

      if (revenueChart) {
        revenueChart.data.labels = labels;
        revenueChart.data.datasets[0].data = revenues;
        revenueChart.update();
      } else {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        revenueChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Daily Revenue (GHS)',
              data: revenues,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#667eea',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: v => 'GHS ' + v }
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading revenue chart:', error);
  }
}

// Load occupancy trend data
async function loadOccupancyTrendData() {
  try {
    const response = await fetch(`${API_URL}/admin/analytics/occupancy?period=week`, {
      credentials: 'include'
    });
    const data = await response.json();

    if (data.success) {
      const chartData = data.data;
      const labels = chartData.map(item => item.date);
      const rates = chartData.map(item => item.rate);

      if (occupancyChart) {
        occupancyChart.data.labels = labels;
        occupancyChart.data.datasets[0].data = rates;
        occupancyChart.update();
      } else {
        const ctx = document.getElementById('occupancy-chart').getContext('2d');
        occupancyChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Occupancy Rate (%)',
              data: rates,
              borderColor: '#764ba2',
              backgroundColor: 'rgba(118, 75, 162, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#764ba2',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: { callback: v => v + '%' }
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Error loading occupancy trend:', error);
  }
}

// Load revenue data
async function loadRevenueData() {
  const period = document.getElementById('revenue-period')?.value || 'week';

  try {
    const [detailRes, topRoomsRes] = await Promise.all([
      fetch(`${API_URL}/admin/analytics/revenue?period=${period}`, { credentials: 'include' }),
      fetch(`${API_URL}/rooms/stats?top=5`, { credentials: 'include' })
    ]);

    const [detailData, topRoomsData] = await Promise.all([
      detailRes.json(),
      topRoomsRes.json()
    ]);

    if (detailData.success) {
      const chartData = detailData.data;
      const labels = chartData.map(item => item.date);
      const revenues = chartData.map(item => item.revenue);
      const totalRevenue = revenues.reduce((a, b) => a + b, 0);
      const avgRevenue = revenues.length > 0 ? totalRevenue / revenues.length : 0;

      document.getElementById('total-revenue').textContent = `GHS ${totalRevenue.toFixed(2)}`;
      document.getElementById('avg-revenue').textContent = `GHS ${avgRevenue.toFixed(2)}`;
      document.getElementById('revenue-bookings').textContent = chartData.length;

      if (revenueDetailChart) {
        revenueDetailChart.data.labels = labels;
        revenueDetailChart.data.datasets[0].data = revenues;
        revenueDetailChart.update();
      } else {
        const ctx = document.getElementById('revenue-detail-chart').getContext('2d');
        revenueDetailChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Daily Revenue (GHS)',
              data: revenues,
              backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderColor: '#667eea',
              borderRadius: 8,
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { callback: v => 'GHS ' + v }
              }
            }
          }
        });
      }
    }

    if (topRoomsData.success) {
      displayTopRooms(topRoomsData.data);
    }
  } catch (error) {
    showToast('Failed to load revenue data', 'error');
  }
}

// Display top rooms
function displayTopRooms(rooms) {
  const tbody = document.getElementById('top-rooms-tbody');
  
  if (!rooms || rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">No data available</td></tr>';
    return;
  }

  tbody.innerHTML = rooms.map(room => `
    <tr>
      <td>${room.title}</td>
      <td>${room.totalBookings || 0}</td>
      <td>GHS ${(room.totalRevenue || 0).toFixed(2)}</td>
      <td>GHS ${room.totalBookings > 0 ? (room.totalRevenue / room.totalBookings).toFixed(2) : '0.00'}</td>
    </tr>
  `).join('');
}

// Load occupancy data
async function loadOccupancyData() {
  try {
    const [trendRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/admin/analytics/occupancy?period=month`, { credentials: 'include' }),
      fetch(`${API_URL}/rooms/stats`, { credentials: 'include' })
    ]);

    const [trendData, statsData] = await Promise.all([
      trendRes.json(),
      statsRes.json()
    ]);

    if (trendData.success) {
      const chartData = trendData.data;
      const labels = chartData.map(item => item.date);
      const rates = chartData.map(item => item.rate);
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;

      document.getElementById('current-occupancy').textContent = `${rates[rates.length - 1] || 0}%`;
      document.getElementById('avg-occupancy-week').textContent = `${avg.toFixed(0)}%`;
      document.getElementById('avg-occupancy-month').textContent = `${avg.toFixed(0)}%`;

      if (occupancyTrendChart) {
        occupancyTrendChart.data.labels = labels;
        occupancyTrendChart.data.datasets[0].data = rates;
        occupancyTrendChart.update();
      } else {
        const ctx = document.getElementById('occupancy-trend-chart').getContext('2d');
        occupancyTrendChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Occupancy Rate (%)',
              data: rates,
              borderColor: '#f5576c',
              backgroundColor: 'rgba(245, 87, 108, 0.1)',
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#f5576c',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: { callback: v => v + '%' }
              }
            }
          }
        });
      }
    }

    if (statsData.success) {
      document.getElementById('status-available').textContent = statsData.data.available || 0;
      document.getElementById('status-occupied').textContent = statsData.data.occupied || 0;
      document.getElementById('status-maintenance').textContent = statsData.data.maintenance || 0;
    }
  } catch (error) {
    showToast('Failed to load occupancy data', 'error');
  }
}

// Load payment data
async function loadPaymentData() {
  try {
    const [summaryRes, statsRes] = await Promise.all([
      fetch(`${API_URL}/payments/methods/summary`, { credentials: 'include' }),
      fetch(`${API_URL}/payments/stats`, { credentials: 'include' })
    ]);

    const [summaryData, statsData] = await Promise.all([
      summaryRes.json(),
      statsRes.json()
    ]);

    if (summaryData.success) {
      displayPaymentSummary(summaryData.data);
      displayPaymentChart(summaryData.data);
    }

    if (statsData.success) {
      document.getElementById('status-completed').textContent = statsData.data.completed || 0;
      document.getElementById('status-pending').textContent = statsData.data.pending || 0;
      document.getElementById('status-failed').textContent = statsData.data.failed || 0;
    }
  } catch (error) {
    showToast('Failed to load payment data', 'error');
  }
}

// Display payment summary
function displayPaymentSummary(methods) {
  const tbody = document.getElementById('payment-summary-tbody');
  const totalAmount = methods.reduce((sum, m) => sum + m.total_amount, 0);

  if (!methods || methods.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">No payment data</td></tr>';
    return;
  }

  tbody.innerHTML = methods.map(method => `
    <tr>
      <td>${method.method.charAt(0).toUpperCase() + method.method.slice(1)}</td>
      <td>${method.count}</td>
      <td>GHS ${method.total_amount.toFixed(2)}</td>
      <td>${((method.total_amount / totalAmount) * 100).toFixed(1)}%</td>
    </tr>
  `).join('');
}

// Display payment chart
function displayPaymentChart(methods) {
  const labels = methods.map(m => m.method.charAt(0).toUpperCase() + m.method.slice(1));
  const amounts = methods.map(m => m.total_amount);
  const colors = ['#667eea', '#764ba2', '#f5576c', '#ffa502'];

  if (paymentMethodsChart) {
    paymentMethodsChart.data.labels = labels;
    paymentMethodsChart.data.datasets[0].data = amounts;
    paymentMethodsChart.update();
  } else {
    const ctx = document.getElementById('payment-methods-chart').getContext('2d');
    paymentMethodsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: amounts,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

// Load rooms data
async function loadRoomsData() {
  try {
    const response = await fetch(`${API_URL}/rooms`, { credentials: 'include' });
    const data = await response.json();

    if (data.success) {
      displayRoomsTable(data.data);
    }
  } catch (error) {
    showToast('Failed to load rooms data', 'error');
  }
}

// Display rooms table
function displayRoomsTable(rooms) {
  const tbody = document.getElementById('rooms-tbody');

  if (!rooms || rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No rooms available</td></tr>';
    return;
  }

  tbody.innerHTML = rooms.map(room => `
    <tr>
      <td>${room.title}</td>
      <td>GHS ${room.price?.toFixed(2) || '0.00'}</td>
      <td><span class="status-badge status-${room.status}">${room.status.toUpperCase()}</span></td>
      <td>${room.max_guests || 0}</td>
      <td>${room.totalBookings || 0}</td>
      <td>GHS ${(room.totalRevenue || 0).toFixed(2)}</td>
    </tr>
  `).join('');
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
