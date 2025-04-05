# Todo List REST API

A simple CRUD REST API for managing todo items built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or a MongoDB Atlas connection string)
- npm (Node Package Manager)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/todo-api
   ```
4. Start the server:
   ```bash
   node server.js
   ```

## API Endpoints

### Get All Todos
- **GET** `/api/todos`
- Returns all todos sorted by creation date

### Get Single Todo
- **GET** `/api/todos/:id`
- Returns a specific todo by ID

### Create Todo
- **POST** `/api/todos`
- Creates a new todo
- Request body:
  ```json
  {
    "title": "Todo title",
    "description": "Todo description"
  }
  ```

### Update Todo
- **PATCH** `/api/todos/:id`
- Updates an existing todo
- Request body (all fields are optional):
  ```json
  {
    "title": "Updated title",
    "description": "Updated description",
    "completed": true
  }
  ```

### Delete Todo
- **DELETE** `/api/todos/:id`
- Deletes a todo by ID

## Example Usage

```bash
# Get all todos
curl http://localhost:3000/api/todos

# Create a new todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Node.js", "description": "Study Node.js basics"}'

# Get a specific todo
curl http://localhost:3000/api/todos/:id

# Update a todo
curl -X PATCH http://localhost:3000/api/todos/:id \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Delete a todo
curl -X DELETE http://localhost:3000/api/todos/:id
``` 