// models/item.js
const mongoose = require('mongoose');
module.exports = mongoose.model('Item', new mongoose.Schema({
  title: String,
  author: String,
  isbn: String,
  createdAt: { type: Date, default: Date.now }
}));