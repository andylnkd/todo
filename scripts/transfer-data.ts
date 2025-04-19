import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../drizzle/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SOURCE_DB_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_DB_URL = process.env.DATABASE_URL;

if (!SOURCE_DB_URL || !TARGET_DB_URL) {
  console.error('Error: Database URLs not found in environment variables');
  console.error('Please ensure your .env.local file contains:');
  console.error('SOURCE_DATABASE_URL=your_current_render_database_url');
  console.error('DATABASE_URL=your_new_digitalocean_database_url');
  process.exit(1);
}

async function transferData() {
  // Source database connection
  const sourceClient = postgres(SOURCE_DB_URL as string, { prepare: false });
  const sourceDb = drizzle(sourceClient, { schema });

  // Target database connection
  const targetClient = postgres(TARGET_DB_URL as string, { prepare: false });
  const targetDb = drizzle(targetClient, { schema });

  try {
    // 1. Get all data from source database
    console.log('Fetching data from source database...');
    
    const categories = await sourceDb.query.categories.findMany();
    console.log(`Found ${categories.length} categories`);
    
    const actionItems = await sourceDb.query.actionItems.findMany();
    console.log(`Found ${actionItems.length} action items`);
    
    const nextSteps = await sourceDb.query.nextSteps.findMany();
    console.log(`Found ${nextSteps.length} next steps`);
    
    const transcriptions = await sourceDb.query.transcriptions.findMany();
    console.log(`Found ${transcriptions.length} transcriptions`);

    // 2. Insert data into target database
    console.log('\nInserting data into target database...');

    // Insert transcriptions first (no dependencies)
    console.log('Inserting transcriptions...');
    for (const transcription of transcriptions) {
      await targetDb.insert(schema.transcriptions).values(transcription);
    }

    // Insert categories
    console.log('Inserting categories...');
    for (const category of categories) {
      await targetDb.insert(schema.categories).values(category);
    }

    // Insert action items
    console.log('Inserting action items...');
    for (const item of actionItems) {
      await targetDb.insert(schema.actionItems).values(item);
    }

    // Insert next steps
    console.log('Inserting next steps...');
    for (const step of nextSteps) {
      await targetDb.insert(schema.nextSteps).values(step);
    }

    console.log('\nData transfer completed successfully!');
  } catch (error) {
    console.error('Error during data transfer:', error);
    throw error;
  } finally {
    // Close database connections
    await sourceClient.end();
    await targetClient.end();
  }
}

// Run the transfer
transferData().catch((err) => {
  console.error('Data transfer failed:', err);
  process.exit(1);
}); 