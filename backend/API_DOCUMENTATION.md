# Hotel Booking System - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All authenticated endpoints require an active session via `POST /api/auth/login`

## Response Format
All responses follow this format:
```json
{
  "success": true/false,
  "data": {},
  "error": "error message (if error)"
}
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "user"  // optional: user, front_desk, manager, admin
}
```

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "password123"
}
```

### Get Current User
```http
GET /auth/me
```
*Requires authentication*

### Update User Profile
```http
PUT /auth/me
Content-Type: application/json

{
  "email": "newemail@example.com",
  "full_name": "Jane Doe"
}
```
*Requires authentication*

### Change Password
```http
POST /auth/change-password
Content-Type: application/json

{
  "current_password": "oldpassword",
  "new_password": "newpassword"
}
```
*Requires authentication*

### Logout
```http
POST /auth/logout
```
*Requires authentication*

---

## 🛏️ Room Management Endpoints

### Get All Rooms
```http
GET /rooms?status=available&location=Downtown&min_price=100&max_price=500
```

**Query Parameters:**
- `status`: available, occupied, maintenance, unavailable
- `location`: filter by location
- `min_price`: minimum price
- `max_price`: maximum price

### Get Available Rooms
```http
GET /rooms/available?check_in_date=2024-03-10&check_out_date=2024-03-15&max_guests=2
```

**Query Parameters:**
- `check_in_date`: ISO date format (required)
- `check_out_date`: ISO date format (required)
- `max_guests`: optional guests filter

### Get Room by ID
```http
GET /rooms/:id
```

### Get Occupancy Stats
```http
GET /rooms/stats
```

### Create Room (Admin Only)
```http
POST /rooms
Content-Type: application/json

{
  "title": "Deluxe Suite",
  "description": "Spacious luxury suite",
  "price": 250.00,
  "bedrooms": 2,
  "bathrooms": 2,
  "max_guests": 4,
  "amenities": ["WiFi", "AC", "TV", "Mini Bar"],
  "status": "available",
  "location": "5th Floor"
}
```
*Requires admin authentication*

### Update Room (Admin Only)
```http
PUT /rooms/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 300.00,
  ...
}
```
*Requires admin authentication*

### Update Room Status (Admin Only)
```http
PATCH /rooms/:id/status
Content-Type: application/json

{
  "status": "maintenance"
}
```
*Requires admin authentication*

### Delete Room (Admin Only)
```http
DELETE /rooms/:id
```
*Requires admin authentication*

---

## 👥 Customer Management Endpoints

### Create Customer
```http
POST /customers
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA"
}
```

### Get All Customers
```http
GET /customers?limit=50&offset=0
```
*Requires authentication*

### Get Customer by ID
```http
GET /customers/:id
```
*Requires authentication*

### Update Customer
```http
PUT /customers/:id
Content-Type: application/json

{
  "full_name": "Jane Doe",
  "phone": "+1234567890"
}
```
*Requires authentication*

### Delete Customer
```http
DELETE /customers/:id
```
*Requires authentication*

### Get Customer Booking History
```http
GET /customers/:id/bookings
```
*Requires authentication*

---

## 📅 Booking Endpoints

### Create Booking
```http
POST /bookings
Content-Type: application/json

{
  "customer_id": 1,
  "room_id": 5,
  "check_in_date": "2024-03-10",
  "check_out_date": "2024-03-15",
  "number_of_guests": 2,
  "special_requests": "High floor preferred"
}
```

### Get All Bookings
```http
GET /bookings?status=confirmed&room_id=5&customer_id=1&limit=50&offset=0
```
*Requires authentication*

**Query Parameters:**
- `status`: pending, confirmed, checked_in, checked_out, cancelled
- `room_id`: filter by room
- `customer_id`: filter by customer
- `from_date`: start date
- `to_date`: end date

### Get Booking by ID
```http
GET /bookings/:id
```
*Requires authentication*

### Update Booking
```http
PUT /bookings/:id
Content-Type: application/json

{
  "status": "confirmed",
  "special_requests": "Updated request"
}
```
*Requires authentication*

### Check-in Guest (Front Desk)
```http
POST /bookings/:id/checkin
```
*Requires front_desk or admin role*

### Check-out Guest (Front Desk)
```http
POST /bookings/:id/checkout
```
*Requires front_desk or admin role*

### Get Today's Check-ins (Front Desk)
```http
GET /bookings/checkins/today
```
*Requires front_desk or admin role*

### Get Today's Check-outs (Front Desk)
```http
GET /bookings/checkouts/today
```
*Requires front_desk or admin role*

### Get Booking Statistics
```http
GET /bookings/stats
```
*Requires authentication*

### Get Occupancy Rate (Manager)
```http
GET /bookings/occupancy/rate
```
*Requires manager or admin role*

### Delete Booking
```http
DELETE /bookings/:id
```
*Requires front_desk or admin role*

---

## 💳 Payment Endpoints

### Create Payment
```http
POST /payments
Content-Type: application/json

{
  "booking_id": 1,
  "amount": 1250.00,
  "payment_method": "card",
  "status": "pending"
}
```

### Get All Payments
```http
GET /payments?status=completed&payment_method=card&limit=50&offset=0
```
*Requires authentication*

**Query Parameters:**
- `status`: pending, completed, failed, refunded
- `payment_method`: cash, card, bank_transfer, mobile_money
- `from_date`: start date
- `to_date`: end date

### Get Payment by ID
```http
GET /payments/:id
```
*Requires authentication*

### Update Payment
```http
PUT /payments/:id
Content-Type: application/json

{
  "status": "completed"
}
```
*Requires manager or admin role*

### Process Payment (Manager)
```http
POST /payments/:id/process
Content-Type: application/json

{
  "card_number": "4111111111111111",
  "expiry": "12/25",
  "cvv": "123"
}
```
*Requires manager or admin role*

### Refund Payment (Manager)
```http
POST /payments/:id/refund
```
*Requires manager or admin role*

### Get Payment Statistics (Manager)
```http
GET /payments/stats
```
*Requires manager or admin role*

### Get Revenue Report (Manager)
```http
GET /payments/report?from_date=2024-03-01&to_date=2024-03-31
```
*Requires manager or admin role*

### Get Payment Methods Summary (Manager)
```http
GET /payments/methods/summary
```
*Requires manager or admin role*

---

## 🎛️ Admin Endpoints

### Get Dashboard Statistics
```http
GET /admin/stats
```
*Requires admin role*

### Get Revenue Analytics
```http
GET /admin/analytics/revenue?from_date=2024-03-01&to_date=2024-03-31
```
*Requires admin role*

### Get Occupancy Analytics
```http
GET /admin/analytics/occupancy
```
*Requires admin role*

### Get All Users
```http
GET /admin/users?limit=50&offset=0
```
*Requires admin role*

### Get Users by Role
```http
GET /admin/users/role/front_desk
```
*Requires admin role*

**Available roles:** user, front_desk, manager, admin, main_admin

### Create User (Admin)
```http
POST /admin/users
Content-Type: application/json

{
  "username": "newstaff",
  "email": "staff@example.com",
  "password": "password123",
  "full_name": "Staff Member",
  "role": "front_desk"
}
```
*Requires admin role*

### Update User (Admin)
```http
PUT /admin/users/:id
Content-Type: application/json

{
  "role": "manager",
  "email": "newemail@example.com"
}
```
*Requires admin role*

### Delete User (Admin)
```http
DELETE /admin/users/:id
```
*Requires admin role*

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **user** | Book rooms, view own profile |
| **front_desk** | Manage check-in/check-out, view bookings |
| **manager** | View analytics, revenue reports, occupancy rates |
| **admin** | Full access including staff management |
| **main_admin** | Super admin with all permissions |

---

## Error Handling

Common error responses:

```json
{
  "success": false,
  "error": "Not authenticated"
}
```

**HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad request
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error

---

## Example Workflow: Complete Booking

```bash
# 1. Register as customer
POST /auth/register
{"username": "customer1", "email": "cust@example.com", "password": "pass", "full_name": "John"}

# 2. Check available rooms
GET /rooms/available?check_in_date=2024-03-10&check_out_date=2024-03-15

# 3. Create booking
POST /bookings
{"customer_id": 1, "room_id": 1, "check_in_date": "2024-03-10", "check_out_date": "2024-03-15", "number_of_guests": 2}

# 4. Process payment
POST /payments
{"booking_id": 1, "amount": 1250.00, "payment_method": "card"}

# 5. Check in guest (Admin)
POST /bookings/1/checkin

# 6. Check out guest (Admin)
POST /bookings/1/checkout
```

---

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/hotel_booking
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SESSION_SECRET=your-secret-key
NODE_ENV=production
```
