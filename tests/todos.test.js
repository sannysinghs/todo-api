// Set NODE_ENV to test before importing
process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Todo = require('../models/Todo');
const Changelog = require('../models/Changelog');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Disconnect if already connected (due to previous tests or server import)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Todo.deleteMany({});
  await Changelog.deleteMany({});
});

describe('GET /api/todos', () => {
  it('should return empty array when no todos exist', async () => {
    const response = await request(app).get('/api/todos');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return all todos', async () => {
    // Create test todos
    const todo1 = await Todo.create({
      title: 'Test Todo 1',
      description: 'Description 1',
      completed: false
    });
    
    const todo2 = await Todo.create({
      title: 'Test Todo 2',
      description: 'Description 2',
      completed: true
    });

    const response = await request(app).get('/api/todos');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.body[0].title).toBe('Test Todo 1');
    expect(response.body[1].title).toBe('Test Todo 2');
  });

  it('should filter todos by ids', async () => {
    // Create test todos
    const todo1 = await Todo.create({
      title: 'Test Todo 1',
      description: 'Description 1',
      completed: false
    });
    
    const todo2 = await Todo.create({
      title: 'Test Todo 2',
      description: 'Description 2',
      completed: true
    });

    const response = await request(app)
      .get(`/api/todos?id=${todo1._id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].title).toBe('Test Todo 1');
  });

  it('should filter todos by multiple ids', async () => {
    // Create test todos
    const todo1 = await Todo.create({
      title: 'Test Todo 1',
      description: 'Description 1',
      completed: false
    });
    
    const todo2 = await Todo.create({
      title: 'Test Todo 2',
      description: 'Description 2',
      completed: true
    });

    const response = await request(app)
      .get(`/api/todos?id=${todo1._id}&id=${todo2._id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
  });
});

describe('GET /api/todos/:id', () => {
  it('should return 404 when todo not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app).get(`/api/todos/${fakeId}`);
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Todo not found');
  });

  it('should return a single todo by id', async () => {
    const todo = await Todo.create({
      title: 'Test Todo',
      description: 'Description',
      completed: false
    });

    const response = await request(app).get(`/api/todos/${todo._id}`);
    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Test Todo');
    expect(response.body.description).toBe('Description');
    expect(response.body.completed).toBe(false);
  });
});

describe('GET /api/todos/changelist', () => {
  it('should return changelog entries with version greater than lastSyncedVersion', async () => {
    const response = await request(app)
      .get('/api/todos/changelist?lastSyncedVersion=0');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

// Tests for POST API
describe('POST /api/todos', () => {
  it('should create a new todo', async () => {
    const todoData = {
      title: 'New Todo',
      description: 'New Todo Description',
      completed: false
    };

    const response = await request(app)
      .post('/api/todos')
      .send(todoData);

    expect(response.status).toBe(201);
    expect(response.body[0].title).toBe(todoData.title);
    expect(response.body[0].description).toBe(todoData.description);
    expect(response.body[0].completed).toBe(todoData.completed);
    
    // Verify todo was saved to database
    const savedTodo = await Todo.findById(response.body[0]._id);
    expect(savedTodo).not.toBeNull();
    expect(savedTodo.title).toBe(todoData.title);
    
    // Verify changelog was created
    const changelog = await Changelog.findOne({ resourceId: savedTodo._id });
    expect(changelog).not.toBeNull();
    expect(changelog.resourceType).toBe('todo');
    expect(changelog.isDeleted).toBe(false);
    expect(changelog.version).toBe(0); // First version should be 0
  });

  it('should create changelog entries for each todo when creating multiple todos', async () => {
    const todosData = [
      {
        title: 'Todo 1',
        description: 'Description 1',
        completed: false
      },
      {
        title: 'Todo 2',
        description: 'Description 2',
        completed: true
      }
    ];

    const response = await request(app)
      .post('/api/todos')
      .send(todosData);

    expect(response.status).toBe(201);
    expect(response.body.length).toBe(2);
    
    // Verify changelogs were created with sequential versions
    const changelogs = await Changelog.find().sort({ version: 1 });
    expect(changelogs.length).toBe(2);
    expect(changelogs[0].version).toBe(0);
    expect(changelogs[1].version).toBe(1);
    
    // Match changelogs to todos
    expect(changelogs[0].resourceId).toBe(response.body[0]._id.toString());
    expect(changelogs[1].resourceId).toBe(response.body[1]._id.toString());
  });

  it('should create multiple todos when array is provided', async () => {
    const todosData = [
      {
        title: 'Todo 1',
        description: 'Description 1',
        completed: false
      },
      {
        title: 'Todo 2',
        description: 'Description 2',
        completed: true
      }
    ];

    const response = await request(app)
      .post('/api/todos')
      .send(todosData);

    expect(response.status).toBe(201);
    expect(response.body.length).toBe(2);
    
    // Check first todo
    expect(response.body[0].title).toBe(todosData[0].title);
    expect(response.body[0].description).toBe(todosData[0].description);
    
    // Check second todo
    expect(response.body[1].title).toBe(todosData[1].title);
    expect(response.body[1].completed).toBe(todosData[1].completed);
    
    // Verify todos were saved to database
    const savedTodos = await Todo.find();
    expect(savedTodos.length).toBe(2);
  });

  it('should set default values for optional fields', async () => {
    const todoData = {
      title: 'Minimal Todo'
    };

    const response = await request(app)
      .post('/api/todos')
      .send(todoData);

    expect(response.status).toBe(201);
    expect(response.body[0].title).toBe(todoData.title);
    expect(response.body[0].completed).toBe(false); // default value
    expect(response.body[0].priority).toBe('medium'); // default value
    expect(Array.isArray(response.body[0].tags)).toBe(true); // default empty array
    expect(response.body[0].tags.length).toBe(0);
  });

  it('should return 400 if title is missing', async () => {
    const todoData = {
      description: 'Missing Title'
    };

    const response = await request(app)
      .post('/api/todos')
      .send(todoData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 if request body is empty', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send();

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Request body is required');
  });

  it('should correctly handle additional fields', async () => {
    const todoData = {
      title: 'Todo with Tags',
      description: 'Has tags and priority',
      tags: ['work', 'important'],
      priority: 'high'
    };

    const response = await request(app)
      .post('/api/todos')
      .send(todoData);

    expect(response.status).toBe(201);
    expect(response.body[0].tags).toEqual(todoData.tags);
    expect(response.body[0].priority).toBe(todoData.priority);
  });
});

// Tests for PATCH API
describe('PATCH /api/todos/:id', () => {
  it('should update a todo title and create a changelog entry', async () => {
    // Create a todo to update
    const todo = await Todo.create({
      title: 'Original Title',
      description: 'Original Description',
      completed: false
    });
    
    // Create initial changelog
    await Changelog.create({
      resourceId: todo._id,
      resourceType: 'todo',
      version: 0,
      isDeleted: false
    });

    const updateData = {
      title: 'Updated Title'
    };

    const response = await request(app)
      .patch(`/api/todos/${todo._id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.title).toBe(updateData.title);
    
    // Verify a new changelog entry was created
    const changelogs = await Changelog.find({ resourceId: todo._id }).sort({ version: 1 });
    expect(changelogs.length).toBe(2);
    expect(changelogs[1].version).toBe(1); // Second version should be 1
    expect(changelogs[1].isDeleted).toBe(false);
  });

  it('should update multiple fields and create a single changelog entry', async () => {
    const todo = await Todo.create({
      title: 'Original Title',
      description: 'Original Description',
      completed: false
    });
    
    // Create initial changelog
    await Changelog.create({
      resourceId: todo._id,
      resourceType: 'todo',
      version: 0,
      isDeleted: false
    });

    const updateData = {
      title: 'Updated Title',
      description: 'Updated Description',
      completed: true
    };

    const response = await request(app)
      .patch(`/api/todos/${todo._id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    
    // Verify only one new changelog entry was created despite multiple fields being updated
    const changelogs = await Changelog.find({ resourceId: todo._id });
    expect(changelogs.length).toBe(2);
  });

  it('should update a todo description', async () => {
    const todo = await Todo.create({
      title: 'Test Todo',
      description: 'Original Description',
      completed: false
    });

    const updateData = {
      description: 'Updated Description'
    };

    const response = await request(app)
      .patch(`/api/todos/${todo._id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.description).toBe(updateData.description);
    expect(response.body.title).toBe(todo.title); // unchanged
  });

  it('should update a todo completed status', async () => {
    const todo = await Todo.create({
      title: 'Test Todo',
      description: 'Test Description',
      completed: false
    });

    const updateData = {
      completed: true
    };

    const response = await request(app)
      .patch(`/api/todos/${todo._id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.completed).toBe(true);
  });

  it('should update multiple fields at once', async () => {
    const todo = await Todo.create({
      title: 'Original Title',
      description: 'Original Description',
      completed: false
    });

    const updateData = {
      title: 'Updated Title',
      description: 'Updated Description',
      completed: true
    };

    const response = await request(app)
      .patch(`/api/todos/${todo._id}`)
      .send(updateData);

    expect(response.status).toBe(200);
    expect(response.body.title).toBe(updateData.title);
    expect(response.body.description).toBe(updateData.description);
    expect(response.body.completed).toBe(updateData.completed);
  });

  it('should return 404 when updating non-existent todo', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .patch(`/api/todos/${nonExistentId}`)
      .send({ title: 'New Title' });
    
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Todo not found');
  });

  it('should handle invalid ID format', async () => {
    const response = await request(app)
      .patch('/api/todos/invalid-id')
      .send({ title: 'New Title' });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });
});

// Add tests for DELETE endpoint
describe('DELETE /api/todos/:id', () => {
  it('should delete a todo and create a changelog entry with isDeleted=true', async () => {
    // Create a todo for testing deletion
    const todo = await Todo.create({
      title: 'Delete Test Todo',
      description: 'This todo will be deleted',
      completed: false
    });
    
    // Create initial changelog
    await Changelog.create({
      resourceId: todo._id,
      resourceType: 'todo',
      version: 0,
      isDeleted: false
    });

    // Send delete request
    const response = await request(app)
      .delete(`/api/todos/${todo._id}`);
    
    // Check response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Todo deleted');

    // Verify todo was deleted from database
    const todoExists = await Todo.findById(todo._id);
    expect(todoExists).toBeNull();
    
    // Verify a deletion changelog was created
    const changelogs = await Changelog.find({ resourceId: todo._id }).sort({ version: 1 });
    expect(changelogs.length).toBe(2);
    expect(changelogs[1].version).toBe(1);
    expect(changelogs[1].isDeleted).toBe(true); // Should be marked as deleted
  });

  it('should not create a changelog when deleting non-existent todo', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    // Count changelogs before
    const beforeCount = await Changelog.countDocuments();
    
    const response = await request(app)
      .delete(`/api/todos/${nonExistentId}`);
    
    expect(response.status).toBe(404);
    
    // Verify no new changelog was created
    const afterCount = await Changelog.countDocuments();
    expect(afterCount).toBe(beforeCount);
  });

  it('should return 500 when deleting with invalid id format', async () => {
    const response = await request(app)
      .delete('/api/todos/invalid-id-format');
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
  });

  it('should successfully delete when multiple todos exist', async () => {
    // Create multiple todos
    const todo1 = await Todo.create({
      title: 'Todo 1',
      description: 'Description 1',
      completed: false
    });
    
    const todo2 = await Todo.create({
      title: 'Todo 2',
      description: 'Description 2',
      completed: true
    });

    // Delete one todo
    const response = await request(app)
      .delete(`/api/todos/${todo1._id}`);
    
    expect(response.status).toBe(200);
    
    // Verify only the intended todo was deleted
    const remainingTodos = await Todo.find();
    expect(remainingTodos.length).toBe(1);
    expect(remainingTodos[0]._id.toString()).toBe(todo2._id.toString());
  });
});

// Test for changelog versioning across operations
describe('Changelog versioning', () => {
  it('should maintain sequential versioning across different operations', async () => {
    // 1. Create a todo
    const createResponse = await request(app)
      .post('/api/todos')
      .send({ title: 'Sequential Test' });
    
    const todoId = createResponse.body[0]._id;
    
    // 2. Update the todo
    await request(app)
      .patch(`/api/todos/${todoId}`)
      .send({ title: 'Updated Sequential Test' });
    
    // 3. Create another todo
    await request(app)
      .post('/api/todos')
      .send({ title: 'Another Todo' });
    
    // 4. Delete the first todo
    await request(app)
      .delete(`/api/todos/${todoId}`);
    
    // Check changelog versions
    const changelogs = await Changelog.find().sort({ version: 1 });
    
    expect(changelogs.length).toBe(4);
    expect(changelogs[0].version).toBe(0);
    expect(changelogs[1].version).toBe(1);
    expect(changelogs[2].version).toBe(2);
    expect(changelogs[3].version).toBe(3);
    
    // Check operations are correctly recorded
    expect(changelogs[0].resourceId).toBe(todoId.toString());
    expect(changelogs[0].isDeleted).toBe(false); // Creation
    
    expect(changelogs[1].resourceId).toBe(todoId.toString());
    expect(changelogs[1].isDeleted).toBe(false); // Update
    
    expect(changelogs[2].isDeleted).toBe(false); // Creation of another todo
    
    expect(changelogs[3].resourceId).toBe(todoId.toString());
    expect(changelogs[3].isDeleted).toBe(true); // Deletion
  });
}); 