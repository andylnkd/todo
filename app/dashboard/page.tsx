// Remove 'use client';

// Import server-side dependencies
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Correct import for server components
import { redirect } from 'next/navigation';
import { db } from '../../drizzle/db'; // Corrected path
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../drizzle/schema'; // Corrected path
import { eq, desc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache'; // Import for revalidation

// Import components
import ActionItemsTable from '../components/ActionItemsTable';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import AudioRecorderWrapper from '../components/AudioRecorderWrapper'; // We will create this component
import SendDashboardButton from '../components/SendDashboardButton'; // Use relative path
import CopyMarkdownButton from '../components/CopyMarkdownButton'; // Import the new button
import RefineListWrapper from '../components/RefineListWrapper'; // Add this import
import SendWhatsAppButton from '../components/SendWhatsAppButton';
import { SelectedItemsProvider } from '../context/SelectedItemsContext';

// Define the expected data structure for the table
interface NextStepDetail {
  id: string;
  text: string;
  completed: boolean;
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
      eq(categoriesTable.id, actionItemsTable.categoryId)
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="w-10" /> {/* Spacer to help center the title */}
          <h1 className="text-2xl font-bold">Produktive Dashboard</h1>
          <div className="w-10">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <SelectedItemsProvider>
            {/* === Client Component for Recording === */}
            <AudioRecorderWrapper />
            {/* ===================================== */}
            
            {/* === Client Component for Sending Email === */}
            <SendDashboardButton /> 
            {/* ======================================== */}

            {/* === Display Fetched Action Items === */}
            {categories.length > 0 ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Your Action Items</CardTitle>
                  <div className="flex items-center gap-2">
                    <RefineListWrapper categories={categories} />
                    <CopyMarkdownButton categories={categories as any} />
                    <SendWhatsAppButton categories={categories} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ActionItemsTable 
                    categories={categories} 
                    onSaveCategory={saveCategoryName} 
                    onSaveActionItem={saveActionItemText} 
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                 <CardHeader>
                  <CardTitle>Action Items</CardTitle>
                </CardHeader>
                <CardContent>
                   <p className="text-gray-500 text-center py-4">No action items found. Record a voice note to get started!</p>
                </CardContent>
              </Card>
            )}
            {/* ===================================== */}
          </SelectedItemsProvider>
        </div>
      </main>
    </div>
  );
} 