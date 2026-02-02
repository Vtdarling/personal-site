const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Get all indexes
    const indexes = await db.collection('stories').listIndexes().toArray();
    const indexNames = indexes.map(i => i.name);
    console.log('Current indexes:', indexNames);
    
    // Drop the old unique index on formattedDate
    if (indexNames.includes('formattedDate_1')) {
      await db.collection('stories').dropIndex('formattedDate_1');
      console.log('✓ Dropped old formattedDate_1 index');
    }
    
    // Drop compound index if exists
    if (indexNames.includes('formattedDate_1_category_1')) {
      await db.collection('stories').dropIndex('formattedDate_1_category_1');
      console.log('✓ Dropped old compound index');
    }
    
    // Create new compound unique index for daily stories only
    await db.collection('stories').createIndex(
      { formattedDate: 1, category: 1 },
      { 
        unique: true,
        partialFilterExpression: { category: "daily" }
      }
    );
    console.log('✓ Created new compound unique index for daily stories');
    
    // Verify new indexes
    const newIndexList = await db.collection('stories').listIndexes().toArray();
    const newIndexNames = newIndexList.map(i => i.name);
    console.log('New indexes:', newIndexNames);
    
    await mongoose.connection.close();
    console.log('✓ Cleanup complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

cleanup();
