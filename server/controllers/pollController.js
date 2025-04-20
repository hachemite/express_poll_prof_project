const Poll = require('../models/Poll');
const PollOption = require('../models/PollOption');
const Vote = require('../models/Vote');
const mongoose = require('mongoose'); 

// Create a new poll with options
const createPoll = async (req, res) => {
  try {
    const { creator_id, title, description, options, start_date, end_date } = req.body;

    // Validate required fields
    if (!title || !options || options.length < 2) {
      return res.status(400).json({ 
        message: 'Title and at least 2 options are required' 
      });
    }

    // Create the poll
    const newPoll = new Poll({
      creator_id,
      title,
      description,
      start_date: start_date || Date.now(),
      end_date,
      is_active: true
    });

    const savedPoll = await newPoll.save();

    // Create poll options
    const pollOptions = await Promise.all(
      options.map(async (optionText, index) => {
        const option = new PollOption({
          poll_id: savedPoll._id,
          option_text: optionText,
          display_order: index
        });
        return await option.save();
      })
    );

    res.status(201).json({
      poll: savedPoll,
      options: pollOptions
    });

  } catch (error) {
    console.error('Poll creation error:', error);
    res.status(500).json({ message: 'Server error creating poll' });
  }
};

// Get a single poll with its options
const getPoll = async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.poll_id)// objectif de recupérer l'id du poll
      .populate('creator_id', 'username email') // populate permet de recupérer les informations de l'utilisateur qui a créé le poll
      .lean(); //lean permet de convertir l'objet en objet javascript

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Get poll options
    const options = await PollOption.find({ poll_id: poll._id })
      .sort('display_order')
      .select('-__v')
      .lean();

    res.json({
      ...poll,
      options
    });

  } catch (error) {
    console.error('Poll fetch error:', error);
    res.status(500).json({ message: 'Server error fetching poll' });
  }
};

// Update a poll (title, description, dates)
const updatePoll = async (req, res) => {
  try {
    const { poll_id } = req.params;
    const updateData = req.body;

    // Don't allow changing options via this endpoint
    if (updateData.options) {
      return res.status(400).json({ 
        message: 'Use dedicated endpoints to modify options' 
      });
    }

    const updatedPoll = await Poll.findByIdAndUpdate(
      poll_id,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator_id', 'username email');

    if (!updatedPoll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    res.json(updatedPoll);

  } catch (error) {
    console.error('Poll update error:', error);
    res.status(500).json({ message: 'Server error updating poll' });
  }
};

// Delete a poll and its associated data
const deletePoll = async (req, res) => {
  try {
    const { poll_id } = req.params;

    // Start transaction
    const session = await Poll.startSession();
    session.startTransaction();

    try {
      // Delete poll options first
      await PollOption.deleteMany({ poll_id }).session(session);

      // Delete votes
      await Vote.deleteMany({ poll_id }).session(session);

      // Delete the poll
      const deletedPoll = await Poll.findByIdAndDelete(poll_id).session(session);

      await session.commitTransaction();
      session.endSession();

      if (!deletedPoll) {
        return res.status(404).json({ message: 'Poll not found' });
      }

      res.json({ message: 'Poll and all associated data deleted successfully' });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error('Poll deletion error:', error);
    res.status(500).json({ message: 'Server error deleting poll' });
  }
};

// List polls with filters and pagination
// List polls with filters, pagination, and search
const listPolls = async (req, res) => {
  try {
    const { creator_id, is_active, page = 1, limit = 10, search } = req.query;
    
    let query = Poll.find();

    // Basic filters
    if (creator_id) query = query.where('creator_id').equals(creator_id);
    if (is_active) query = query.where('is_active').equals(is_active === 'true');

    // Search functionality
    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        query = query.or([
          { title: { $regex: search, $options: 'i' } },
          { _id: search }
        ]);
      } else {
        query = query.regex('title', new RegExp(search, 'i'));
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [polls, total] = await Promise.all([
      query.clone()
        .populate('creator_id', 'username')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      query.countDocuments()
    ]);

    res.json({
      polls,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: pageNum
    });

  } catch (error) {
    console.error('Poll listing error:', error);
    res.status(500).json({ 
      message: 'Server error listing polls',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};
// Search polls by title or ID
const searchPolls = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return res.status(400).json({ message: 'Valid search term required' });
    }

    const polls = await Poll.find({
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { _id: searchTerm }
      ]
    })
    .populate('creator_id', 'username')
    .limit(20)
    .sort({ created_at: -1 });

    res.json({ polls });

  } catch (error) {
    console.error('Poll search error:', error);
    res.status(500).json({ message: 'Server error searching polls' });
  }
};


// Get poll results with vote counts
const getPollResults = async (req, res) => {
    try {
      const { poll_id } = req.params;
  
      // Verify poll exists
      const pollExists = await Poll.exists({ _id: poll_id });
      if (!pollExists) {
        return res.status(404).json({ message: 'Poll not found' });
      }
  
      // Get vote counts per option
      const results = await Vote.aggregate([
        { 
          $match: { 
            poll_id: new mongoose.Types.ObjectId(poll_id) // Fixed this line
          } 
        },
        { $group: { _id: '$option_id', count: { $sum: 1 } } },
        { 
          $lookup: {
            from: 'polloptions',
            localField: '_id',
            foreignField: '_id',
            as: 'option'
          }
        },
        { $unwind: '$option' },
        { 
          $project: {
            option_id: '$_id',
            option_text: '$option.option_text',
            count: 1,
            _id: 0
          }
        },
        { $sort: { count: -1 } }
      ]);
  
      // Rest of the function remains the same...
    // Get total votes
    const totalVotes = results.reduce((sum, option) => sum + option.count, 0);

    res.json({
      poll_id,
      total_votes: totalVotes,
      results
    });

  } catch (error) {
    console.error('Poll results error:', error);
    res.status(500).json({ message: 'Server error getting poll results' });
  }
};

module.exports = {
  createPoll,
  getPoll,
  updatePoll,
  deletePoll,
  listPolls,
  getPollResults,
  searchPolls // Add the new function to exports
};