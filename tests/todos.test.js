const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const Todo = require('../models/Todo');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Todo.deleteMany({});
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