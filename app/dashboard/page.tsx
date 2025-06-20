// Remove 'use client';

// Import server-side dependencies
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Correct import for server components
import { redirect } from 'next/navigation';
import { db } from '../../drizzle/db'; // Corrected path
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../drizzle/schema'; // Corrected path
import { eq, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache'; // Import for revalidation
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Import components
import ActionItemsTable from '../components/ActionItemsTable';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import SendDashboardButton from '../components/SendDashboardButton'; // Use relative path
import CopyMarkdownButton from '../components/CopyMarkdownButton'; // Import the new button
import RefineListWrapper from '../components/RefineListWrapper'; // Add this import
import SendWhatsAppButton from '../components/SendWhatsAppButton';
import { SelectedItemsProvider } from '../context/SelectedItemsContext';
import { CombineCategoriesButton } from '@/app/components/CombineCategoriesButton';
import { processTranscriptAndSave } from '@/app/server-actions/transcriptActions'; // Using alias
import InputHub from '../components/InputHub'; // Import the new InputHub

// --- Server Actions for Saving ---
async function saveCategoryName(id: string, newName: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.update(categoriesTable)
      .set({ name: newName, updatedAt: new Date() })
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to save category:", error);
    throw new Error("Failed to update category name.");
  }
}

async function saveActionItemText(id: string, newText: string, newDueDate?: Date | null) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const updateData: { actionItem: string; updatedAt: Date; dueDate?: Date | null } = { actionItem: newText, updatedAt: new Date() };
    if (newDueDate !== undefined) {
      updateData.dueDate = newDueDate;
    }
    
    await db.update(actionItemsTable)
      .set(updateData)
      .where(and(eq(actionItemsTable.id, id), eq(actionItemsTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to save action item:", error);
    throw new Error("Failed to update action item text.");
  }
}

async function deleteNextStep(id: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.delete(nextStepsTable)
      .where(and(eq(nextStepsTable.id, id), eq(nextStepsTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to delete next step:", error);
    throw new Error("Failed to delete next step.");
  }
}

async function addActionItem(categoryId: string, text: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.insert(actionItemsTable)
      .values({
        categoryId,
        actionItem: text,
        userId
      });
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to add action item:", error);
    throw new Error("Failed to add action item.");
  }
}

async function deleteActionItem(id: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.delete(actionItemsTable)
      .where(and(eq(actionItemsTable.id, id), eq(actionItemsTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to delete action item:", error);
    throw new Error("Failed to delete action item.");
  }
}

async function addCategory(name: string): Promise<string | null> { // Ensure return type matches what QuickAddForm expects
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const [inserted] = await db.insert(categoriesTable)
      .values({ name, userId })
      .returning({ id: categoriesTable.id });
    revalidatePath('/dashboard');
    return inserted.id;
  } catch (error) {
    console.error("Failed to add category:", error);
    // Return null or throw, depending on desired error handling in the component
    return null;
  }
}

async function deleteCategory(id: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    // 1. Find all action item IDs for this category
    const actionItems = await db.select({ id: actionItemsTable.id })
      .from(actionItemsTable)
      .where(and(eq(actionItemsTable.categoryId, id), eq(actionItemsTable.userId, userId)));
    const actionItemIds = actionItems.map(ai => ai.id);

    if (actionItemIds.length > 0) {
      // 2. Delete all next steps for these action items
      await db.delete(nextStepsTable)
        .where(and(
          inArray(nextStepsTable.actionItemId, actionItemIds),
          eq(nextStepsTable.userId, userId)
        ));
      // 3. Delete all action items for this category
      await db.delete(actionItemsTable)
        .where(and(
          inArray(actionItemsTable.id, actionItemIds),
          eq(actionItemsTable.userId, userId)
        ));
    }
    // 4. Delete the category
    await db.delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to delete category:", error);
    throw new Error("Failed to delete category.");
  }
}

async function handleDashboardTranscriptProcessed(transcript: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('User not authenticated for dashboard processing');

  try {
    await processTranscriptAndSave({
      transcript,
      userId,
      itemType: 'regular',
    });
    revalidatePath('/dashboard');
  } catch (error) {
    console.error("Dashboard transcript processing error:", error);
    // Optionally, return an error message to be displayed
  }
}

async function handleImageUploaded(file: File) {
  'use server';
  // Placeholder logic for image handling
  console.log('Received image on server:', file.name, file.size);
  // TODO: Implement image processing and saving logic (e.g., save to blob storage, process with AI)
  revalidatePath('/dashboard');
}

// --- End Server Actions ---

// The main Dashboard page component is now async
export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in'); // Redirect if not logged in
  }

  // Fetch all categories once for the dropdown and emoji mapping
  const allCategories = await db.query.categories.findMany({
    where: eq(categoriesTable.userId, userId)
  });

  // Fetch categories with items and next steps
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.userId, userId))
    .leftJoin(
      actionItemsTable,
      and(
        eq(categoriesTable.id, actionItemsTable.categoryId),
        eq(actionItemsTable.type, 'regular') // Filter for regular action items
      )
    )
    .leftJoin(
      nextStepsTable,
      eq(actionItemsTable.id, nextStepsTable.actionItemId)
    )
    .then((rows) => {
      // Process the rows into a nested structure
      const categoriesMap = new Map();
      
      rows.forEach((row) => {
        if (!row.categories) return;
        
        const categoryId = row.categories.id;
        if (!categoriesMap.has(categoryId)) {
          categoriesMap.set(categoryId, {
            id: categoryId,
            name: row.categories.name,
            items: new Map()
          });
        }
        
        const category = categoriesMap.get(categoryId);
        
        if (row.action_items) {
          const actionItemId = row.action_items.id;
          if (!category.items.has(actionItemId)) {
            category.items.set(actionItemId, {
              actionItemId,
              actionItem: row.action_items.actionItem,
              dueDate: row.action_items.dueDate ? row.action_items.dueDate : null,
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
        }
      });
      
      // Convert Maps to arrays for the final structure
      return Array.from(categoriesMap.values()).map(category => ({
        ...category,
        items: Array.from(category.items.values())
      }));
    });

  // Sort categories by name
  categories.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <SelectedItemsProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold">Innatus</Link>
            <div className="flex items-center gap-4">
              <Link href="/daily"><Button variant="outline">Daily Dump</Button></Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <InputHub
              categories={allCategories}
              onTranscriptProcessed={handleDashboardTranscriptProcessed}
              onAddCategory={addCategory}
              onAddActionItem={addActionItem}
              onImageUploaded={handleImageUploaded}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <CombineCategoriesButton categories={categories} />
                  <RefineListWrapper categories={categories} />
                  <SendWhatsAppButton categories={categories} />
                  <CopyMarkdownButton categories={categories} />
                  <SendDashboardButton />
                </div>
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
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SelectedItemsProvider>
  );
} 