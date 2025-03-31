// Remove 'use client';

// Import server-side dependencies
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Correct import for server components
import { redirect } from 'next/navigation';
import { db } from '../../drizzle/db'; // Corrected path
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../drizzle/schema'; // Corrected path
import { eq, desc } from 'drizzle-orm';

// Import components
import ActionItemsTable from '../components/ActionItemsTable';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import AudioRecorderWrapper from '../components/AudioRecorderWrapper'; // We will create this component
import SendDashboardButton from '../components/SendDashboardButton'; // Use relative path
import CopyMarkdownButton from '../components/CopyMarkdownButton'; // Import the new button

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

// The main Dashboard page component is now async
export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in'); // Redirect if not logged in
  }

  // Fetch action items from the database
  const userCategories = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      actionItemId: actionItemsTable.id,
      actionItemText: actionItemsTable.actionItem,
      nextStepId: nextStepsTable.id,
      nextStepText: nextStepsTable.step,
      nextStepCompleted: nextStepsTable.completed,
      actionItemCreatedAt: actionItemsTable.createdAt,
    })
    .from(categoriesTable)
    .leftJoin(actionItemsTable, eq(categoriesTable.id, actionItemsTable.categoryId))
    .leftJoin(nextStepsTable, eq(actionItemsTable.id, nextStepsTable.actionItemId))
    .where(eq(categoriesTable.userId, userId))
    .orderBy(desc(actionItemsTable.createdAt), categoriesTable.name, actionItemsTable.id, nextStepsTable.id);

  // Process the fetched data into the structure expected by ActionItemsTable
  const actionItemsFormatted: CategoryWithItems[] = [];
  const categoryMap = new Map<string, {
    id: string;
    name: string;
    items: Map<string, {
      id: string;
      actionItem: string;
      nextSteps: Map<string, NextStepDetail>;
    }>;
  }>();

  for (const row of userCategories) {
    if (!row.categoryId) continue;

    let category = categoryMap.get(row.categoryId);
    if (!category) {
      category = { id: row.categoryId, name: row.categoryName!, items: new Map() };
      categoryMap.set(row.categoryId, category);
    }

    if (row.actionItemId) {
      let actionItem = category.items.get(row.actionItemId);
      if (!actionItem) {
        actionItem = { id: row.actionItemId, actionItem: row.actionItemText!, nextSteps: new Map() };
        category.items.set(row.actionItemId, actionItem);
      }

      if (row.nextStepId && row.nextStepText !== null) {
        if (!actionItem.nextSteps.has(row.nextStepId)) {
          actionItem.nextSteps.set(row.nextStepId, {
            id: row.nextStepId,
            text: row.nextStepText,
            completed: row.nextStepCompleted!,
          });
        }
      }
    }
  }

  // Convert maps to the final array structure
  categoryMap.forEach(categoryData => {
    const itemsArray: ActionItemWithNextSteps[] = [];
    categoryData.items.forEach(itemData => {
      const nextStepsArray = Array.from(itemData.nextSteps.values());
      itemsArray.push({
        actionItemId: itemData.id,
        actionItem: itemData.actionItem,
        nextSteps: nextStepsArray
      });
    });
    actionItemsFormatted.push({ id: categoryData.id, name: categoryData.name, items: itemsArray });
  });

  // Sort categories by name
  actionItemsFormatted.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Voice Notes Dashboard</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* === Client Component for Recording === */}
          <AudioRecorderWrapper />
          {/* ===================================== */}
          
          {/* === Client Component for Sending Email === */}
          <SendDashboardButton /> 
          {/* ======================================== */}

          {/* === Display Fetched Action Items === */}
          {actionItemsFormatted.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Your Action Items</CardTitle>
                <CopyMarkdownButton categories={actionItemsFormatted as any} />
              </CardHeader>
              <CardContent>
                <ActionItemsTable categories={actionItemsFormatted} />
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
        </div>
      </main>
    </div>
  );
} 