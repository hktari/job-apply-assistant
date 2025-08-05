import { config } from 'dotenv';
import { join } from 'path';
import { TestDbHelper } from './test-db.helper';

// Load test environment variables
config({ path: join(__dirname, '..', '.env.test') });

// Global test setup
beforeAll(async () => {
  // Ensure database exists and is properly set up
  await TestDbHelper.setupTestDb();
}, 30000); // 30 second timeout for database setup

afterAll(async () => {
  // Clean up database and disconnect
  await TestDbHelper.teardownTestDb();
}, 10000); // 10 second timeout for cleanup
