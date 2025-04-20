const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  poll_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true,
  },
  option_text: {
    type: String,
    required: true,
    trim: true,
  },
  display_order: {
    type: Number,
    required: true,
    default: 0,
  },
});

const PollOption = mongoose.model('PollOption', pollOptionSchema);

module.exports = PollOption;