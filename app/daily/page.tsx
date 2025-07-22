import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../drizzle/db';
import * as schema from '../../drizzle/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { processTranscriptAndSave } from '@/app/server-actions/transcriptActions';
import InputHub from '../components/InputHub';
import ActionItemsTable from '../components/ActionItemsTable';
import { SelectedItemsProvider } from '../context/SelectedItemsContext';

// Helper to get start and end of today
function getTodayTimestamps() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function addCategory(name: string): Promise<string | null> {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  try {
    const [inserted] = await db.insert(schema.categories)
      .values({ name, userId })
      .returning({ id: schema.categories.id });
    revalidatePath('/daily');
    return inserted.id;
  } catch (error) {
    console.error("Failed to add category:", error);
    return null;
  }
}

async function addActionItem(categoryId: string, text: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await db.insert(schema.actionItems).values({ categoryId, actionItem: text, userId, type: 'daily' });
  revalidatePath('/daily');
}

async function saveCategoryName(id: string, newName: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await db.update(schema.categories)
    .set({ name: newName, updatedAt: new Date() })
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId)));
  revalidatePath('/daily');
}

async function saveActionItemText(id: string, newText: string, newDueDate?: Date | null) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const updateData: { actionItem: string; updatedAt: Date; dueDate?: Date | null } = { actionItem: newText, updatedAt: new Date() };
  if (newDueDate !== undefined) {
    updateData.dueDate = newDueDate;
  }
  
  await db.update(schema.actionItems)
    .set(updateData)
    .where(and(eq(schema.actionItems.id, id), eq(schema.actionItems.userId, userId)));
  revalidatePath('/daily');
}

async function deleteNextStep(id: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await db.delete(schema.nextSteps)
    .where(and(eq(schema.nextSteps.id, id), eq(schema.nextSteps.userId, userId)));
  revalidatePath('/daily');
}

async function deleteActionItem(id: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  // First delete all next steps for this action item
  await db.delete(schema.nextSteps)
    .where(and(eq(schema.nextSteps.actionItemId, id), eq(schema.nextSteps.userId, userId)));
  // Then delete the action item
  await db.delete(schema.actionItems)
    .where(and(eq(schema.actionItems.id, id), eq(schema.actionItems.userId, userId)));
  revalidatePath('/daily');
}

async function deleteCategory(id: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Find all action item IDs for this category
  const actionItems = await db.select({ id: schema.actionItems.id })
    .from(schema.actionItems)
    .where(and(eq(schema.actionItems.categoryId, id), eq(schema.actionItems.userId, userId)));
  const actionItemIds = actionItems.map(ai => ai.id);

  if (actionItemIds.length > 0) {
    // Delete all next steps for these action items
    await db.delete(schema.nextSteps)
      .where(and(
        inArray(schema.nextSteps.actionItemId, actionItemIds),
        eq(schema.nextSteps.userId, userId)
      ));
    // Delete all action items for this category
    await db.delete(schema.actionItems)
      .where(and(
        inArray(schema.actionItems.id, actionItemIds),
        eq(schema.actionItems.userId, userId)
      ));
  }
  // Delete the category
  await db.delete(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, userId)));
  revalidatePath('/daily');
}

async function handleSaveExtractedItems(items: string[]) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('User not authenticated');

  const transcript = items.join('\\n');
  if (!transcript) return;

  try {
    await processTranscriptAndSave({
      transcript,
      userId,
      itemType: 'daily',
    });
    revalidatePath('/daily');
  } catch (error) {
    console.error("Daily extracted items processing error:", error);
    throw error;
  }
}

export default async function DailyPage() {
  const { userId } = await auth();
  if (!userId) {
    return <p className="p-4 text-center text-red-500">Please sign in to view this page.</p>;
  }

  const { start, end } = getTodayTimestamps();

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
    // Only process rows that have an action item for today
    if (!row.categories || !row.action_items) return;

    const categoryId = row.categories.id;
    if (!categoriesMap.has(categoryId)) {
      categoriesMap.set(categoryId, {
        id: categoryId,
        name: row.categories.name,
        // The status can be derived or added to the schema if needed
        status: 'pending', 
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

  async function handleDailyTranscriptProcessed(transcript: string) {
    'use server';
    if (!userId) throw new Error('User not authenticated for daily processing');
    
    try {
      await processTranscriptAndSave({
        transcript,
        userId,
        itemType: 'daily',
      });
      revalidatePath('/daily');
    } catch (error) {
      console.error("Error processing daily transcript in server action:", error);
      throw error;
    }
  }

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
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <InputHub
              categories={allCategoriesForUser}
              onTranscriptProcessed={handleDailyTranscriptProcessed}
              onAddCategory={addCategory}
              onAddActionItem={addActionItem}
              onSaveExtractedItems={handleSaveExtractedItems}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <ActionItemsTable
                  categories={categories}
                  onSaveCategory={saveCategoryName}
                  onSaveActionItem={saveActionItemText}
                  onDeleteNextStep={deleteNextStep}
                  onAddActionItem={addActionItem}
                  onDeleteActionItem={deleteActionItem}
                  onAddCategory={addCategory}
                  onDeleteCategory={deleteCategory}
                  isDailyView={true}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SelectedItemsProvider>
  );
} 