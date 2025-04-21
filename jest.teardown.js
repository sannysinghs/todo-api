const mongoose = require('mongoose');

module.exports = async () => {
  // Close the mongoose connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}; 