const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const Changelog = require('../models/Changelog');

// Get all todos
router.get('/', async (req, res) => {
  try {
    const ids = req.params.ids || []
    const todos = await Todo.find(ids.length ? { _id: { $in: ids } } : {}).sort({ createdAt: -1})
    res.json(todos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/changelist/', async (req, res) => {
  try {
    const lastSyncedVersion = req.query.lastSyncedVersion || 0
    res.json(await Changelog.find({ version: {$gt: lastSyncedVersion} }))
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single todo
router.get('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.json(todo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new todo or multiple todos
router.post('/', async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const todosData = Array.isArray(req.body) ? req.body : [req.body];
    const savedTodos = [];
    
    const lastChangelog = await Changelog.findOne().sort({version: -1});
    let lastSyncedVersion = lastChangelog ? lastChangelog.version : 0
    
    for (const data of todosData) {
      const todo = new Todo({
        title: data.title,
        description: data.description,
        completed: data.completed || false,
        priority: data.priority || 'medium',
        tags: data.tags || [],
        due_date: data.due_date,
        dependencies: data.dependencies || [],
        image: data.image
      });

      const savedTodo = await todo.save();
      // increment changelog version 
      lastSyncedVersion++ 
      // create changelog record
      const log = new Changelog({
        resourceId: savedTodo._id,
        version : lastSyncedVersion,
        isDeleted: false,
      })

      await log.save()
      savedTodos.push(savedTodo);
    }

    return res.status(201).json(savedTodos);
    
  } catch (error) {
    console.error('Error details:', error);
    return res.status(400).json({ message: error.message });
  }
});

// Update a todo
router.patch('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    if (req.body.title) {
      todo.title = req.body.title;
    }
    if (req.body.description) {
      todo.description = req.body.description;
    }
    if (req.body.completed !== undefined) {
      todo.completed = req.body.completed;
    }

    const updatedTodo = await todo.save();
    res.json(updatedTodo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a todo
router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    await todo.deleteOne();
    res.json({ message: 'Todo deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 