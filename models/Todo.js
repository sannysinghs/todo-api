const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  due_date: {
    type: Date,
    required: false
  },
  dependencies: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Todo',
    required: false
  },
  image: {
    type: String,
    required: false
  },
  tags: {
    type: [String],
    required: false
  },
  priority: {
    type: String,
    required: false
  },
});

module.exports = mongoose.model('Todo', todoSchema); 