import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../drizzle/db';
import * as schema from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InputHub from '../components/InputHub';
import ActionItemsTable from '../components/ActionItemsTable';
import { SelectedItemsProvider } from '../context/SelectedItemsContext';
import InstallAppButton from '../components/InstallAppButton';
import SendWhatsAppButton from '../components/SendWhatsAppButton';
import ShareToTelegramButton from '../components/ShareToTelegramButton';
import NativeShareButton from '../components/NativeShareButton';
import CopySelectedItemsButton from '../components/CopySelectedItemsButton';

function getDailyWindow(hours = 48) {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { start, end };
}

export default async function DailyPage() {
  const { userId } = await auth();
  if (!userId) {
    return <p className="p-4 text-center text-red-500">Please sign in to view this page.</p>;
  }

  const { start, end } = getDailyWindow(48);

  // Fetch all categories for the InputHub dropdown
  const allCategoriesForUser = await db.query.categories.findMany({
    where: eq(schema.categories.userId, userId)
  });

  // Fetch and structure daily items for the ActionItemsTable
  const dailyItemsRaw = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId))
    .leftJoin(
      schema.actionItems,
      and(
        eq(schema.categories.id, schema.actionItems.categoryId),
        eq(schema.actionItems.type, 'daily'),
        gte(schema.actionItems.createdAt, start),
        lte(schema.actionItems.createdAt, end)
      )
    )
    .leftJoin(
      schema.nextSteps,
      eq(schema.actionItems.id, schema.nextSteps.actionItemId)
    );

  // Process the rows into a nested structure suitable for ActionItemsTable
  const categoriesMap = new Map();
  dailyItemsRaw.forEach((row) => {
    // Only process rows that have an action item in the active Daily Dump window.
    if (!row.categories || !row.action_items) return;

    const categoryId = row.categories.id;
    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        id: categoryId,
        name: row.categories.name,
        status: row.categories.status,
        createdAt: row.categories.createdAt,
        items: new Map()
      });
    }

    const category = categoriesMap.get(categoryId);
    const actionItemId = row.action_items.id;

    if (!category.items.has(actionItemId)) {
      category.items.set(actionItemId, {
        actionItemId,
        actionItem: row.action_items.actionItem,
        dueDate: row.action_items.dueDate,
        status: row.action_items.status,
        priority: row.action_items.priority,
        nextSteps: []
      });
    }

    if (row.next_steps) {
      const nextStep = {
        id: row.next_steps.id,
        text: row.next_steps.step,
        completed: row.next_steps.completed,
        dueDate: row.next_steps.dueDate ? new Date(row.next_steps.dueDate) : null
      };
      category.items.get(actionItemId).nextSteps.push(nextStep);
    }
  });
  
  // Convert Maps to arrays for the final structure
  const categories = Array.from(categoriesMap.values()).map(category => ({
    ...category,
    items: Array.from(category.items.values())
  }));

  // Sort categories by name
  categories.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SelectedItemsProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-baseline gap-4">
                <Link href="/dashboard" className="text-base font-medium text-gray-600 hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <h1 className="text-2xl font-semibold text-gray-800">Daily Dump</h1>
              </div>
              <div className="flex items-center gap-3">
                <InstallAppButton />
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <InputHub
              categories={allCategoriesForUser}
              variant="daily"
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Last 48 Hours</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Daily items stay visible here for 48 hours before expiring.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <SendWhatsAppButton categories={categories} title="Daily Dump" />
                  <ShareToTelegramButton categories={categories} title="Daily Dump" />
                  <NativeShareButton categories={categories} title="Daily Dump" />
                  <CopySelectedItemsButton categories={categories} title="Daily Dump" />
                </div>
              </CardHeader>
              <CardContent>
                <ActionItemsTable
                  categories={categories}
                  variant="daily"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SelectedItemsProvider>
  );
} 
