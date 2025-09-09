# Leave Management System - JSON Server

This project uses JSON Server to provide a local REST API for development.

## Getting Started

### Installation
The dependencies are already installed. If you need to reinstall them:
```bash
npm install
```

### Running the Server
To start the JSON server:
```bash
npm run server
```

The server will start on `http://localhost:3000`

To run the server accessible from other devices on your network:
```bash
npm run server:host
```

## API Endpoints

The JSON server automatically creates REST endpoints based on the data in `db.json`:

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get a specific user
- `POST /users` - Create a new user
- `PUT /users/:id` - Update a user
- `DELETE /users/:id` - Delete a user

### Leaves
- `GET /leaves` - Get all leave requests
- `GET /leaves/:id` - Get a specific leave request
- `POST /leaves` - Create a new leave request
- `PUT /leaves/:id` - Update a leave request
- `DELETE /leaves/:id` - Delete a leave request

### Leave Types
- `GET /leaveTypes` - Get all leave types
- `GET /leaveTypes/:id` - Get a specific leave type

### Departments
- `GET /departments` - Get all departments
- `GET /departments/:id` - Get a specific department

## Query Parameters

You can use query parameters to filter, sort, and paginate:

### Filtering
- `GET /leaves?userId=1` - Get leaves for user with ID 1
- `GET /leaves?status=pending` - Get pending leave requests
- `GET /users?role=employee` - Get all employees

### Sorting
- `GET /leaves?_sort=requestDate&_order=desc` - Sort by request date descending

### Pagination
- `GET /leaves?_page=1&_limit=10` - Get first 10 leave requests

### Relationships
- `GET /leaves?_expand=user` - Include user data in leave requests
- `GET /users?_embed=leaves` - Include user's leaves in user data

## Example Usage in JavaScript

```javascript
// Get all leave requests
fetch('http://localhost:3000/leaves')
  .then(response => response.json())
  .then(data => console.log(data));

// Create a new leave request
fetch('http://localhost:3000/leaves', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 1,
    type: 'vacation',
    startDate: '2025-10-01',
    endDate: '2025-10-05',
    status: 'pending',
    reason: 'Holiday trip',
    requestDate: new Date().toISOString().split('T')[0]
  })
})
.then(response => response.json())
.then(data => console.log(data));

// Update leave request status
fetch('http://localhost:3000/leaves/1', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'approved',
    approvedBy: 4,
    comments: 'Approved by admin'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Database Structure

The `db.json` file contains:
- **users**: Employee information and roles
- **leaves**: Leave requests with status tracking
- **leaveTypes**: Different types of leaves available
- **departments**: Company departments and managers

You can modify the `db.json` file directly or use the API endpoints to make changes.
