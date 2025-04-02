import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const actionItems = pgTable('action_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionItem: text('action_item').notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const nextSteps = pgTable('next_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  step: text('step').notNull(),
  completed: boolean('completed').default(false),
  actionItemId: uuid('action_item_id').references(() => actionItems.id),
  createdAt: timestamp('created_at').defaultNow(),
}); 