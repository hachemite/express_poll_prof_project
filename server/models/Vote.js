const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  poll_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true,
  },
  option_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PollOption',
    required: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Now required since anonymous voting is removed
  },
  voted_at: {
    type: Date,
    default: Date.now,
  },
});

voteSchema.index({ poll_id: 1, user_id: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;