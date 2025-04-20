const express = require('express');
const router = express.Router(); 
const pollController = require('../controllers/pollController');
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

// Poll routes
router.post('/', authMiddleware, pollController.createPoll);
router.get('/', pollController.listPolls);
router.get('/:poll_id', pollController.getPoll);
router.get('/search', pollController.searchPolls);
router.put('/:poll_id', authMiddleware, pollController.updatePoll);
router.delete('/:poll_id', authMiddleware, pollController.deletePoll);
router.get('/:poll_id/results', pollController.getPollResults);

// Vote routes - changed to require authentication
router.post('/:poll_id/vote', authMiddleware, voteController.castVote);
router.get('/:poll_id/vote/status', authMiddleware, voteController.checkVoteStatus);
router.get('/:poll_id/clearVote', authMiddleware, voteController.checkVoteStatus);

module.exports = router;