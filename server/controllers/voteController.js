const Vote = require('../models/Vote');
const Poll = require('../models/Poll');
const PollOption = require('../models/PollOption');

const castVote = async (req, res) => {
    try {
      const { poll_id } = req.params;
      const { option_id } = req.body;
      const user_id = req.user?.id; // From auth middleware

      if (!user_id) {
        return res.status(401).json({ message: 'You must be logged in to vote' });
      }
  
      // Add logging here - this will show who's trying to vote
      console.log(`Vote attempt - User: ${user_id}, Poll: ${poll_id}, Option: ${option_id}`)

      // Check if poll exists and is active
      const poll = await Poll.findById(poll_id);
      if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
      }
  
      if (!poll.is_active) {
        return res.status(400).json({ message: 'This poll is no longer active' });
      }
  
      // Check if option belongs to poll
      const option = await PollOption.findOne({
        _id: option_id,
        poll_id
      });
  
      if (!option) {
        return res.status(400).json({ message: 'Invalid option for this poll' });
      }
  
      // Check if user has already voted
      const existingVote = await Vote.findOne({ poll_id, user_id });

      if (existingVote) {
        return res.status(400).json({ 
          message: 'You have already voted in this poll',
          previous_vote: existingVote.option_id
        });
      }
  
      // Create new vote
      const newVote = new Vote({
        poll_id,
        option_id,
        user_id,
        voted_at: new Date()
      });
  
      await newVote.save();
  
      res.status(201).json({
        message: 'Vote cast successfully',
        vote_id: newVote._id,
        option_id: newVote.option_id
      });
    }
    catch (error) {
      console.error('Vote casting error:', error.name, error.message);
  
      // Check if headers are already sent
      if (res.headersSent) {
        return;
      }
      
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'You have already voted in this poll',
          error: 'duplicate_vote' 
        });
      }
      
      return res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message,
        error_type: error.name
      });
    }
};

const checkVoteStatus = async (req, res) => {
  try {
    const { poll_id } = req.params;
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: 'You must be logged in to check vote status' });
    }

    const vote = await Vote.findOne({ poll_id, user_id }).select('option_id voted_at');
      
    if (!vote) {
        return res.json({ has_voted: false });
    }
      
    res.json({
        has_voted: true,
        option_id: vote.option_id,
        voted_at: vote.voted_at
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const clearVote =  async (req, res) => {
  await Vote.deleteMany({});
  res.send('All votes cleared');
};

module.exports = {
    castVote,
    checkVoteStatus
};