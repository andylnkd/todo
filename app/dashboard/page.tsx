// Remove 'use client';

// Import server-side dependencies
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Correct import for server components
import { redirect } from 'next/navigation';
import { db } from '../../drizzle/db'; // Corrected path
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../drizzle/schema'; // Corrected path
import { eq, desc, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache'; // Import for revalidation
import { Button } from '@/components/ui/button';
import { Combine } from 'lucide-react';
import Link from 'next/link';

// Import components
import ActionItemsTable from '../components/ActionItemsTable';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import AudioRecorderWrapper from '../components/AudioRecorderWrapper'; // We will create this component
import SendDashboardButton from '../components/SendDashboardButton'; // Use relative path
import CopyMarkdownButton from '../components/CopyMarkdownButton'; // Import the new button
import RefineListWrapper from '../components/RefineListWrapper'; // Add this import
import SendWhatsAppButton from '../components/SendWhatsAppButton';
import { SelectedItemsProvider } from '../context/SelectedItemsContext';
import { CombineCategoriesButton } from '@/app/components/CombineCategoriesButton';
import { processTranscriptAndSave } from '@/app/server-actions/transcriptActions'; // Using alias

// Define the expected data structure for the table
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: Date | null;
}

interface ActionItemWithNextSteps {
  actionItemId: string;
  actionItem: string;
  nextSteps: NextStepDetail[];
}

interface CategoryWithItems {
  id: string;
  name: string;
  items: ActionItemWithNextSteps[];
}

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

async function saveActionItemText(id: string, newText: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.update(actionItemsTable)
      .set({ actionItem: newText, updatedAt: new Date() })
      .where(and(eq(actionItemsTable.id, id), eq(actionItemsTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to save action item:", error);
    throw new Error("Failed to update action item text.");
  }
}

async function saveNextStepText(id: string, newText: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.update(nextStepsTable)
      .set({ step: newText, updatedAt: new Date() })
      .where(and(eq(nextStepsTable.id, id), eq(nextStepsTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to save next step:", error);
    throw new Error("Failed to update next step text.");
  }
}

async function toggleNextStepCompleted(id: string, completed: boolean) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.update(nextStepsTable)
      .set({ completed: completed, updatedAt: new Date() })
      .where(and(eq(nextStepsTable.id, id), eq(nextStepsTable.userId, userId)));
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to toggle next step completed:", error);
    throw new Error("Failed to toggle next step completed.");
  }
}

async function addNextStep(actionItemId: string, text: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.insert(nextStepsTable)
      .values({
        actionItemId,
        step: text,
        completed: false,
        userId
      });
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to add next step:", error);
    throw new Error("Failed to add next step.");
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

async function addCategory(name: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    await db.insert(categoriesTable)
      .values({
        name,
        userId
      });
    revalidatePath('/dashboard'); // Revalidate to show changes
  } catch (error) {
    console.error("Failed to add category:", error);
    throw new Error("Failed to add category.");
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
      itemType: 'regular', // Explicitly set to regular, or omit to rely on default
    });
    revalidatePath('/dashboard'); 
  } catch (error) {
    console.error("Error processing dashboard transcript in server action:", error);
    // Handle error as appropriate for the dashboard page
    throw error; 
  }
}

// --- End Server Actions ---

// The main Dashboard page component is now async
export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in'); // Redirect if not logged in
  }

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
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold">Action Items Dashboard</h1>
              <Link href="/daily" className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                Daily
              </Link>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Items</CardTitle>
            </CardHeader>
            <CardContent>
              <AudioRecorderWrapper onTranscriptProcessed={handleDashboardTranscriptProcessed} />
            </CardContent>
          </Card>

          <Card>
            <SelectedItemsProvider>
              <CardHeader>
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                  <CardTitle>Action Items</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <CombineCategoriesButton categories={categories} />
                    <RefineListWrapper categories={categories} />
                    <SendWhatsAppButton categories={categories} />
                    <CopyMarkdownButton categories={categories} />
                    <SendDashboardButton />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ActionItemsTable
                  categories={categories}
                  onSaveCategory={saveCategoryName}
                  onSaveActionItem={saveActionItemText}
                  onSaveNextStep={saveNextStepText}
                  onToggleNextStepCompleted={toggleNextStepCompleted}
                  onAddNextStep={addNextStep}
                  onDeleteNextStep={deleteNextStep}
                  onAddActionItem={addActionItem}
                  onDeleteActionItem={deleteActionItem}
                  onAddCategory={addCategory}
                  onDeleteCategory={deleteCategory}
                />
              </CardContent>
            </SelectedItemsProvider>
          </Card>
        </div>
      </main>
    </div>
  );
} 