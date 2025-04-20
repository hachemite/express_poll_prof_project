// fixVoteIndexes.js - Updated version
const mongoose = require('mongoose');
require('dotenv').config();

async function updateVoteIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get the collection directly
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    // Find the votes collection
    const voteCollectionInfo = collections.find(c => 
      c.name.toLowerCase() === 'votes' || c.name === 'Vote' || c.name === 'Votes');
    
    if (!voteCollectionInfo) {
      console.error('Vote collection not found!');
      process.exit(1);
    }
    
    const voteCollection = db.collection(voteCollectionInfo.name);
    
    // Get current indexes
    const indexes = await voteCollection.indexes();
    console.log('Current indexes:', indexes);
    
    // Check if the problematic index exists
    const hasOldIndex = indexes.some(idx => 
      idx.name === 'poll_id_1_ip_address_1' || 
      (idx.key && idx.key.ip_address));
    
    if (hasOldIndex) {
      console.log('Dropping old index...');
      await voteCollection.dropIndex('poll_id_1_ip_address_1');
      console.log('Old index dropped');
    } else {
      console.log('Old index not found, skipping drop');
    }
    
    // Check if the correct index already exists
    const hasCorrectIndex = indexes.some(idx => 
      idx.name === 'poll_id_1_user_id_1' || 
      (idx.key && idx.key.poll_id && idx.key.user_id));
      
    if (hasCorrectIndex) {
      console.log('Correct index already exists, skipping creation');
    } else {
      // Create the new index only if it doesn't exist
      console.log('Creating new index...');
      await voteCollection.createIndex(
        { poll_id: 1, user_id: 1 }, 
        { unique: true }
      );
      console.log('New index created');
    }
    
    // Verify final state
    const updatedIndexes = await voteCollection.indexes();
    console.log('Updated indexes:', updatedIndexes);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateVoteIndexes();