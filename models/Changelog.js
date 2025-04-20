const mongoose = require('mongoose');

const changelogSchema = new mongoose.Schema({
  resourceId: { type: String, required: true },
  resourceType: { type: String, default: "todo" },
  version: { type: Number, required: true },
  isDeleted: { type:Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Changelog', changelogSchema);  