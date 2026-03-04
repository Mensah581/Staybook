// Admin Dashboard JavaScript

let currentSection = 'dashboard';
let editingItem = null;
let editingType = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadDashboard();
    setupNavigation();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/admin/login.html';
            return;
        }
        
        if (data.user) {
            document.getElementById('admin-name').textContent = `Welcome, ${data.user.name || data.user.username}`;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/admin/login.html';
    }
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const quickLinks = document.querySelectorAll('.quick-link');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    quickLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
        });
    });
}

// Switch section
function switchSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    // Update content
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        overview: 'Overview',
        rooms: 'Rooms',
        discover: 'Discover',
        dining: 'Dining',
        contact: 'Contact',
        media: 'Media Library',
        settings: 'Settings'
    };
    document.getElementById('page-title').textContent = titles[section] || section;
    
    currentSection = section;
    
    // Load section data
    loadSectionData(section);
}

// Load section data
async function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'overview':
            loadOverviewBlocks();
            break;
        case 'rooms':
            loadRooms();
            break;
        case 'discover':
            loadDiscoverItems();
            break;
        case 'dining':
            loadDiningItems();
            break;
        case 'contact':
            loadContactSettings();
            break;
        case 'media':
            loadMediaLibrary();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin/login.html';
    });
    
    // Add buttons
    document.getElementById('add-room-btn')?.addEventListener('click', () => openModal('room'));
    document.getElementById('add-discover-btn')?.addEventListener('click', () => openModal('discover'));
    document.getElementById('add-dining-btn')?.addEventListener('click', () => openModal('dining'));
    
    // Upload area
    document.getElementById('upload-area')?.addEventListener('click', () => {
        document.getElementById('media-upload').click();
    });
    
    document.getElementById('media-upload')?.addEventListener('change', handleMediaUpload);
    
    // Forms
    document.getElementById('contact-form')?.addEventListener('submit', saveContactSettings);
    document.getElementById('settings-form')?.addEventListener('submit', saveSettings);
    
    // Modal
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    document.getElementById('modal-form')?.addEventListener('submit', saveModalForm);
}

// Load Dashboard
async function loadDashboard() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        
        document.getElementById('stat-rooms').textContent = stats.totalRooms || 0;
        document.getElementById('stat-bookings').textContent = stats.totalBookings || 0;
        document.getElementById('stat-media').textContent = stats.totalMedia || 0;
        document.getElementById('stat-sections').textContent = stats.totalSections || 0;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load Overview Blocks
async function loadOverviewBlocks() {
    try {
        const response = await fetch('/api/admin/overview-sections');
        const sections = await response.json();
        
        const container = document.getElementById('overview-blocks');
        
        if (sections.length === 0) {
            container.innerHTML = '<p class="no-items">No sections configured.</p>';
            return;
        }
        
        container.innerHTML = sections.map(section => `
            <div class="block-card">
                <div class="block-image">
                    ${section.image_url ? 
                        `<img src="${section.image_url}" alt="${section.title}">` : 
                        `<div class="no-image"><i class="fas fa-image"></i> No Image</div>`
                    }
                </div>
                <div class="block-content">
                    <h3>${section.title || 'Untitled'}</h3>
                    <p>${section.description || 'No description'}</p>
                    <div class="block-actions">
                        <button class="btn-primary" onclick="editOverviewBlock('${section.section_key}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading overview blocks:', error);
    }
}

// Edit Overview Block
async function editOverviewBlock(key) {
    try {
        const response = await fetch('/api/admin/overview-sections');
        const sections = await response.json();
        const section = sections.find(s => s.section_key === key);
        
        if (!section) return;
        
        editingItem = section;
        editingType = 'overview';
        
        document.getElementById('modal-title').textContent = `Edit: ${section.title}`;
        document.getElementById('modal-title-input').value = section.title || '';
        document.getElementById('modal-desc').value = section.description || '';
        document.getElementById('modal-image').value = section.image_url || '';
        document.getElementById('modal-visible').checked = section.is_visible !== false;
        
        const preview = document.getElementById('modal-image-preview');
        if (section.image_url) {
            preview.innerHTML = `<img src="${section.image_url}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
        
        document.getElementById('modal-extra-fields').innerHTML = '';
        
        openModal('overview');
    } catch (error) {
        console.error('Error loading block:', error);
    }
}

// Load Rooms
async function loadRooms() {
    try {
        const response = await fetch('/api/admin/rooms');
        const rooms = await response.json();
        
        const container = document.getElementById('rooms-list');
        
        if (rooms.length === 0) {
            container.innerHTML = '<p class="no-items">No rooms added yet. Click "Add Room" to get started.</p>';
            return;
        }
        
        container.innerHTML = rooms.map(room => `
            <div class="item-card">
                <div class="item-image">
                    ${room.image_url ? 
                        `<img src="${room.image_url}" alt="${room.title}">` : 
                        `<div class="no-image"><i class="fas fa-bed"></i></div>`
                    }
                    <span class="item-badge ${room.status}">${room.status}</span>
                </div>
                <div class="item-content">
                    <h3>${room.title}</h3>
                    <p>${room.description ? room.description.substring(0, 60) + '...' : 'No description'}</p>
                    <div class="item-price">$${parseFloat(room.price).toFixed(0)} / night</div>
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="editRoom(${room.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-danger" onclick="deleteRoom(${room.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Edit Room
async function editRoom(id) {
    try {
        const response = await fetch('/api/admin/rooms');
        const rooms = await response.json();
        const room = rooms.find(r => r.id === id);
        
        if (!room) return;
        
        editingItem = room;
        editingType = 'room';
        
        document.getElementById('modal-title').textContent = 'Edit Room';
        document.getElementById('modal-title-input').value = room.title || '';
        document.getElementById('modal-desc').value = room.description || '';
        document.getElementById('modal-image').value = room.image_url || '';
        document.getElementById('modal-visible').checked = room.status === 'available';
        document.getElementById('modal-price').value = room.price || 0;
        document.getElementById('modal-amenities').value = room.amenities || '';
        document.getElementById('modal-rating').value = room.rating || 0;
        document.getElementById('modal-review-count').value = room.review_count || 0;
        document.getElementById('modal-beds').value = room.beds || 1;
        document.getElementById('modal-baths').value = room.baths || 1;
        document.getElementById('modal-guests').value = room.guests || 2;
        document.getElementById('modal-size').value = room.size || 25;
        document.getElementById('modal-location').value = room.location || '';
        
        const preview = document.getElementById('modal-image-preview');
        if (room.image_url) {
            preview.innerHTML = `<img src="${room.image_url}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
        
        document.getElementById('modal-extra-fields').innerHTML = `
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label>Price</label>
                    <input type="number" id="modal-price" value="${room.price || 0}" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Rating (0-5)</label>
                    <input type="number" id="modal-rating" value="${room.rating || 0}" min="0" max="5" step="0.1">
                </div>
            </div>
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label>Review Count</label>
                    <input type="number" id="modal-review-count" value="${room.review_count || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="modal-location" value="${room.location || ''}" placeholder="e.g. City Center">
                </div>
            </div>
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label>Beds</label>
                    <input type="number" id="modal-beds" value="${room.beds || 1}" min="1">
                </div>
                <div class="form-group">
                    <label>Baths</label>
                    <input type="number" id="modal-baths" value="${room.baths || 1}" min="1">
                </div>
                <div class="form-group">
                    <label>Guests</label>
                    <input type="number" id="modal-guests" value="${room.guests || 2}" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>Size (m²)</label>
                <input type="number" id="modal-size" value="${room.size || 25}" min="1">
            </div>
            <div class="form-group">
                <label>Amenities (comma separated)</label>
                <textarea id="modal-amenities" rows="2">${room.amenities || ''}</textarea>
            </div>
        `;
        
        openModal('room');
    } catch (error) {
        console.error('Error loading room:', error);
    }
}

// Delete Room
async function deleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
        const response = await fetch(`/api/admin/rooms/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Room deleted successfully', 'success');
            loadRooms();
        } else {
            showToast('Failed to delete room', 'error');
        }
    } catch (error) {
        console.error('Error deleting room:', error);
        showToast('Error deleting room', 'error');
    }
}

// Load Discover Items
async function loadDiscoverItems() {
    try {
        const response = await fetch('/api/admin/discover');
        const items = await response.json();
        
        const container = document.getElementById('discover-list');
        
        if (items.length === 0) {
            container.innerHTML = '<p class="no-items">No discover items. Click "Add Item" to create one.</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-image">
                    ${item.image_url ? 
                        `<img src="${item.image_url}" alt="${item.title}">` : 
                        `<div class="no-image"><i class="fas fa-compass"></i></div>`
                    }
                </div>
                <div class="item-content">
                    <h3>${item.title}</h3>
                    <p>${item.description ? item.description.substring(0, 60) + '...' : 'No description'}</p>
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="editDiscoverItem(${item.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-danger" onclick="deleteDiscoverItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading discover items:', error);
    }
}

// Edit Discover Item
async function editDiscoverItem(id) {
    try {
        const response = await fetch('/api/admin/discover');
        const items = await response.json();
        const item = items.find(i => i.id === id);
        
        if (!item) return;
        
        editingItem = item;
        editingType = 'discover';
        
        document.getElementById('modal-title').textContent = 'Edit Discover Item';
        document.getElementById('modal-title-input').value = item.title || '';
        document.getElementById('modal-desc').value = item.description || '';
        document.getElementById('modal-image').value = item.image_url || '';
        document.getElementById('modal-visible').checked = item.is_visible !== false;
        
        const preview = document.getElementById('modal-image-preview');
        if (item.image_url) {
            preview.innerHTML = `<img src="${item.image_url}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
        
        document.getElementById('modal-extra-fields').innerHTML = '';
        
        openModal('discover');
    } catch (error) {
        console.error('Error loading item:', error);
    }
}

// Delete Discover Item
async function deleteDiscoverItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`/api/admin/discover/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Item deleted successfully', 'success');
            loadDiscoverItems();
        } else {
            showToast('Failed to delete item', 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Error deleting item', 'error');
    }
}

// Load Dining Items
async function loadDiningItems() {
    try {
        const response = await fetch('/api/admin/dining');
        const items = await response.json();
        
        const container = document.getElementById('dining-list');
        
        if (items.length === 0) {
            container.innerHTML = '<p class="no-items">No dining options. Click "Add Restaurant" to create one.</p>';
            return;
        }
        
        container.innerHTML = items.map(item => `
            <div class="item-card">
                <div class="item-image">
                    ${item.image_url ? 
                        `<img src="${item.image_url}" alt="${item.title}">` : 
                        `<div class="no-image"><i class="fas fa-utensils"></i></div>`
                    }
                </div>
                <div class="item-content">
                    <h3>${item.title}</h3>
                    <p>${item.description ? item.description.substring(0, 60) + '...' : 'No description'}</p>
                    ${item.opening_hours ? `<p><small>Hours: ${item.opening_hours}</small></p>` : ''}
                    <div class="item-actions">
                        <button class="btn-secondary" onclick="editDiningItem(${item.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-danger" onclick="deleteDiningItem(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading dining items:', error);
    }
}

// Edit Dining Item
async function editDiningItem(id) {
    try {
        const response = await fetch('/api/admin/dining');
        const items = await response.json();
        const item = items.find(i => i.id === id);
        
        if (!item) return;
        
        editingItem = item;
        editingType = 'dining';
        
        document.getElementById('modal-title').textContent = 'Edit Dining Option';
        document.getElementById('modal-title-input').value = item.title || '';
        document.getElementById('modal-desc').value = item.description || '';
        document.getElementById('modal-image').value = item.image_url || '';
        document.getElementById('modal-visible').checked = item.is_visible !== false;
        
        const preview = document.getElementById('modal-image-preview');
        if (item.image_url) {
            preview.innerHTML = `<img src="${item.image_url}" alt="Preview">`;
        } else {
            preview.innerHTML = '';
        }
        
        document.getElementById('modal-extra-fields').innerHTML = `
            <div class="form-group">
                <label>Opening Hours</label>
                <input type="text" id="modal-hours" value="${item.opening_hours || ''}" placeholder="e.g., 7:00 AM - 10:00 PM">
            </div>
            <div class="form-group">
                <label>Price Range</label>
                <input type="text" id="modal-price-range" value="${item.price_range || ''}" placeholder="e.g., $$ - $$$$">
            </div>
        `;
        
        openModal('dining');
    } catch (error) {
        console.error('Error loading item:', error);
    }
}

// Delete Dining Item
async function deleteDiningItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`/api/admin/dining/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Item deleted successfully', 'success');
            loadDiningItems();
        } else {
            showToast('Failed to delete item', 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Error deleting item', 'error');
    }
}

// Load Contact Settings
async function loadContactSettings() {
    try {
        const response = await fetch('/api/admin/contact');
        const settings = await response.json();
        
        document.getElementById('contact-phone').value = settings.phone || '';
        document.getElementById('contact-email').value = settings.email || '';
        document.getElementById('contact-whatsapp').value = settings.whatsapp || '';
        document.getElementById('contact-map').value = settings.map_link || '';
        document.getElementById('contact-address').value = settings.address || '';
        document.getElementById('contact-facebook').value = settings.facebook_link || '';
        document.getElementById('contact-instagram').value = settings.instagram_link || '';
        document.getElementById('contact-twitter').value = settings.twitter_link || '';
    } catch (error) {
        console.error('Error loading contact settings:', error);
    }
}

// Save Contact Settings
async function saveContactSettings(e) {
    e.preventDefault();
    
    const form = e.target;
    const data = {
        phone: form.phone.value,
        email: form.email.value,
        whatsapp: form.whatsapp.value,
        map_link: form.map_link.value,
        address: form.address.value,
        facebook_link: form.facebook_link.value,
        instagram_link: form.instagram_link.value,
        twitter_link: form.twitter_link.value
    };
    
    try {
        const response = await fetch('/api/admin/contact', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Contact settings saved successfully', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving contact settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Load Settings
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        document.getElementById('setting-hotel-name').value = settings.hotel_name || '';
        document.getElementById('setting-company-name').value = settings.company_name || '';
        document.getElementById('setting-hero-title').value = settings.hero_title || '';
        document.getElementById('setting-hero-text').value = settings.hero_text || '';
        document.getElementById('setting-hero-image').value = settings.hero_image || '';
        document.getElementById('setting-checkin').value = settings.checkin_time || '';
        document.getElementById('setting-checkout').value = settings.checkout_time || '';
        document.getElementById('setting-copyright').value = settings.copyright_year || '';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save Settings
async function saveSettings(e) {
    e.preventDefault();
    
    const form = e.target;
    const data = {
        hotel_name: form.hotel_name.value,
        company_name: form.company_name.value,
        hero_title: form.hero_title.value,
        hero_text: form.hero_text.value,
        hero_image: form.hero_image.value,
        checkin_time: form.checkin_time.value,
        checkout_time: form.checkout_time.value,
        copyright_year: form.copyright_year.value
    };
    
    try {
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Settings saved successfully', 'success');
        } else {
            showToast('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings', 'error');
    }
}

// Load Media Library
async function loadMediaLibrary() {
    try {
        const response = await fetch('/api/admin/media');
        const media = await response.json();
        
        const container = document.getElementById('media-grid');
        
        if (media.length === 0) {
            container.innerHTML = '<p class="no-items">No images uploaded. Use the upload area above.</p>';
            return;
        }
        
        container.innerHTML = media.map(item => `
            <div class="media-item">
                <img src="${item.file_path}" alt="${item.alt_text || item.original_name}">
                <div class="media-item-overlay">
                    <button class="btn-view" onclick="viewMedia('${item.file_path}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteMedia(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading media:', error);
    }
}

// Handle Media Upload
async function handleMediaUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/admin/media', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            showToast('Image uploaded successfully', 'success');
            loadMediaLibrary();
        } else {
            showToast('Failed to upload image', 'error');
        }
    } catch (error) {
        console.error('Error uploading media:', error);
        showToast('Error uploading image', 'error');
    }
    
    e.target.value = '';
}

// Delete Media
async function deleteMedia(id) {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
        const response = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showToast('Image deleted successfully', 'success');
            loadMediaLibrary();
        } else {
            showToast('Failed to delete image', 'error');
        }
    } catch (error) {
        console.error('Error deleting media:', error);
        showToast('Error deleting image', 'error');
    }
}

// Open Modal
function openModal(type) {
    document.getElementById('edit-modal').classList.add('active');
    
    // Reset form
    document.getElementById('modal-title-input').value = '';
    document.getElementById('modal-desc').value = '';
    document.getElementById('modal-image').value = '';
    document.getElementById('modal-visible').checked = true;
    document.getElementById('modal-image-preview').innerHTML = '';
    
    // Clear and set extra fields based on type
    const extraFields = document.getElementById('modal-extra-fields');
    extraFields.innerHTML = '';
    
    if (type === 'room') {
        // Set modal title for new room
        document.getElementById('modal-title').textContent = 'Add New Room';
        
        // Room-specific fields for new room
        extraFields.innerHTML = `
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label>Price</label>
                    <input type="number" id="modal-price" value="0" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>Rating (0-5)</label>
                    <input type="number" id="modal-rating" value="0" min="0" max="5" step="0.1">
                </div>
            </div>
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label>Review Count</label>
                    <input type="number" id="modal-review-count" value="0" min="0">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="modal-location" value="" placeholder="e.g. City Center">
                </div>
            </div>
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div class="form-group">
                    <label>Beds</label>
                    <input type="number" id="modal-beds" value="1" min="1">
                </div>
                <div class="form-group">
                    <label>Baths</label>
                    <input type="number" id="modal-baths" value="1" min="1">
                </div>
                <div class="form-group">
                    <label>Guests</label>
                    <input type="number" id="modal-guests" value="2" min="1">
                </div>
            </div>
            <div class="form-group">
                <label>Size (m²)</label>
                <input type="number" id="modal-size" value="25" min="1">
            </div>
            <div class="form-group">
                <label>Amenities (comma separated)</label>
                <textarea id="modal-amenities" rows="2" placeholder="WiFi, Air Conditioning, TV, Pool"></textarea>
            </div>
        `;
    } else {
        document.getElementById('modal-title').textContent = 'Add New ' + type.charAt(0).toUpperCase() + type.slice(1);
    }
}

// Close Modal
function closeModal() {
    document.getElementById('edit-modal').classList.remove('active');
    editingItem = null;
    editingType = null;
}

// Save Modal Form
async function saveModalForm(e) {
    e.preventDefault();
    
    const title = document.getElementById('modal-title-input').value;
    const description = document.getElementById('modal-desc').value;
    const image_url = document.getElementById('modal-image').value;
    const is_visible = document.getElementById('modal-visible').checked;
    
    let data = { title, description, image_url, is_visible };
    let url = '';
    let method = 'POST';
    
    if (editingType === 'overview' && editingItem) {
        url = `/api/admin/overview-sections/${editingItem.section_key}`;
        method = 'PUT';
        data = { title, description, image_url, is_visible };
    } else if (editingType === 'room' && editingItem) {
        url = `/api/admin/rooms/${editingItem.id}`;
        method = 'PUT';
        data.price = document.getElementById('modal-price')?.value || 0;
        data.amenities = document.getElementById('modal-amenities')?.value || '';
        data.status = is_visible ? 'available' : 'unavailable';
        data.rating = document.getElementById('modal-rating')?.value || 0;
        data.review_count = document.getElementById('modal-review-count')?.value || 0;
        data.beds = document.getElementById('modal-beds')?.value || 1;
        data.baths = document.getElementById('modal-baths')?.value || 1;
        data.guests = document.getElementById('modal-guests')?.value || 2;
        data.size = document.getElementById('modal-size')?.value || 25;
        data.location = document.getElementById('modal-location')?.value || '';
    } else if (editingType === 'discover' && editingItem) {
        url = `/api/admin/discover/${editingItem.id}`;
        method = 'PUT';
    } else if (editingType === 'dining' && editingItem) {
        url = `/api/admin/dining/${editingItem.id}`;
        method = 'PUT';
        data.opening_hours = document.getElementById('modal-hours')?.value || '';
        data.price_range = document.getElementById('modal-price-range')?.value || '';
    } else if (editingType === 'discover' && !editingItem) {
        url = '/api/admin/discover';
    } else if (editingType === 'dining' && !editingItem) {
        url = '/api/admin/dining';
    } else if (editingType === 'room' && !editingItem) {
        // Creating new room
        url = '/api/admin/rooms';
        data.price = document.getElementById('modal-price')?.value || 0;
        data.amenities = document.getElementById('modal-amenities')?.value || '';
        data.status = is_visible ? 'available' : 'unavailable';
        data.rating = document.getElementById('modal-rating')?.value || 0;
        data.review_count = document.getElementById('modal-review-count')?.value || 0;
        data.beds = document.getElementById('modal-beds')?.value || 1;
        data.baths = document.getElementById('modal-baths')?.value || 1;
        data.guests = document.getElementById('modal-guests')?.value || 2;
        data.size = document.getElementById('modal-size')?.value || 25;
        data.location = document.getElementById('modal-location')?.value || '';
    } else {
        showToast('Unknown editing type', 'error');
        return;
    }
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('Saved successfully', 'success');
            closeModal();
            loadSectionData(currentSection);
        } else {
            showToast('Failed to save', 'error');
        }
    } catch (error) {
        console.error('Error saving:', error);
        showToast('Error saving', 'error');
    }
}

// Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// View Media
function viewMedia(url) {
    window.open(url, '_blank');
}
