# Orders API Demo

A simple CRUD API for managing orders using Node.js, Express.js, and MongoDB (Atlas/Mongoose).

## Features

- Create new orders
- Get order by orderId
- Update order status
- Delete orders
- Health check endpoint
- Clean and beginner-friendly code

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB

## Installation

1. Clone the repository or navigate to the project directory
2. Install dependencies:
   
```
bash
   npm install
   
```

## Configuration

1. Create a `.env` file in the root directory (or use the provided one)
2. Update the `MONGO_URI` with your MongoDB connection string

### Sample .env format:
```
# MongoDB Atlas Connection String
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/demo_db?retryWrites=true&w=majority

# Server Port
PORT=5000
```

## How to Run

Start the server:
```
bash
node server.js
```

The server will start on port 5000 (or the port specified in .env).

## API Endpoints

### 1. Health Check
**GET** `/health`

Returns the API status.

**Response:**
```
json
{
  "success": true,
  "message": "API is running",
  "data": {}
}
```

---

### 2. Create Order
**POST** `/orders`

Create a new order.

**Example JSON Body:**
```
json
{
  "orderId": "ORD001",
  "customerName": "John Doe",
  "phone": "+1234567890",
  "product": "Laptop",
  "status": "pending"
}
```

**Example curl request:**
```
bash
curl -X POST http://localhost:5000/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD001","customerName":"John Doe","phone":"+1234567890","product":"Laptop","status":"pending"}'
```

**Response:**
```
json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD001",
    "customerName": "John Doe",
    "phone": "+1234567890",
    "product": "Laptop",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_id": "..."
  }
}
```

---

### 3. Get Order by orderId
**GET** `/orders/:orderId`

Get a specific order by orderId.

**Example curl request:**
```
bash
curl -X GET http://localhost:5000/orders/ORD001
```

**Response (Success):**
```
json
{
  "success": true,
  "message": "Order retrieved successfully",
  "data": {
    "orderId": "ORD001",
    "customerName": "John Doe",
    "phone": "+1234567890",
    "product": "Laptop",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_id": "..."
  }
}
```

**Response (Not Found):**
```
json
{
  "success": false,
  "message": "Order not found",
  "data": {}
}
```

---

### 4. Update Order
**PUT** `/orders/:orderId`

Update an existing order. You can update any field (status, customerName, phone, product).

**Example JSON Body (update status):**
```
json
{
  "status": "shipped"
}
```

**Example JSON Body (update all fields):**
```
json
{
  "customerName": "Jane Doe",
  "phone": "+0987654321",
  "product": "MacBook Pro",
  "status": "delivered"
}
```

**Example curl request:**
```
bash
curl -X PUT http://localhost:5000/orders/ORD001 \
  -H "Content-Type: application/json" \
  -d '{"status":"shipped"}'
```

**Response:**
```
json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "orderId": "ORD001",
    "customerName": "John Doe",
    "phone": "+1234567890",
    "product": "Laptop",
    "status": "shipped",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "_id": "..."
  }
}
```

**Valid status values:** `pending`, `shipped`, `delivered`, `cancelled`

---

### 5. Delete Order
**DELETE** `/orders/:orderId`

Delete an order by orderId.

**Example curl request:**
```
bash
curl -X DELETE http://localhost:5000/orders/ORD001
```

**Response:**
```
json
{
  "success": true,
  "message": "Order deleted successfully",
  "data": {}
}
```

---

## Response Format

All responses follow this format:

```
json
{
  "success": true/false,
  "message": "Human readable message",
  "data": {}
}
```

## Project Structure

```
/config
    db.js              - MongoDB connection
/models
    Order.js           - Order schema
/routes
    orderRoutes.js     - API routes
server.js              - Main server file
.env                   - Environment variables
package.json           - Project dependencies
README.md              - Documentation
```

## Error Handling

- 400: Bad Request (missing fields, invalid data)
- 404: Not Found (order doesn't exist)
- 500: Internal Server Error

## License

ISC
