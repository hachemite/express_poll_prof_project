const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const pollSchema = new mongoose.Schema({
  creator_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  start_date: {
    type: Date,
    default: Date.now,
  },
  end_date: {
    type: Date,
    required: true,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Middleware to update the updated_at field before saving
pollSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Check if poll should be active based on dates
  const now = new Date();
  if (this.end_date && this.end_date < now) {
    this.is_active = false;
  }
  
  next();
});

pollSchema.plugin(mongoosePaginate);

const Poll = mongoose.model('Poll', pollSchema);


module.exports = Poll;