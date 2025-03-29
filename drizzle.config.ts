import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); // Load .env.local

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set!');
}

export default defineConfig({
  dialect: 'postgresql', // Specify the dialect as 'postgresql'
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true, // Optional: for more detailed output during migrations
  strict: true, // Optional: for stricter migration checks
}); 