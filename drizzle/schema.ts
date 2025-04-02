import { pgTable, text, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';

// Categories table
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  status: varchar('status', { length: 50 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Action items table
export const actionItems = pgTable('action_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => categories.id).notNull(),
  actionItem: text('action_item').notNull(),
  transcriptionId: uuid('transcription_id').references(() => transcriptions.id),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Next steps table
export const nextSteps = pgTable('next_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  actionItemId: uuid('action_item_id').references(() => actionItems.id).notNull(),
  step: text('step').notNull(),
  completed: boolean('completed').default(false).notNull(),
  dueDate: timestamp('due_date'),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Transcriptions table to store original recordings
export const transcriptions = pgTable('transcriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  audioUrl: varchar('audio_url', { length: 255 }), // Optional: if we want to store audio files
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}); 