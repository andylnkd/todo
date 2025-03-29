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

// Define the expected data structure for the table
interface NextStep { 
  actionItem: string; // Not really used here, but helps structure
  nextSteps: string[];
}

interface CategoryWithItems {
  name: string;
  items: NextStep[];
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
      nextStepText: nextStepsTable.step,
      actionItemCreatedAt: actionItemsTable.createdAt, // For ordering
    })
    .from(categoriesTable)
    .leftJoin(actionItemsTable, eq(categoriesTable.id, actionItemsTable.categoryId))
    .leftJoin(nextStepsTable, eq(actionItemsTable.id, nextStepsTable.actionItemId))
    .where(eq(categoriesTable.userId, userId))
    .orderBy(desc(actionItemsTable.createdAt), categoriesTable.name, actionItemsTable.id, nextStepsTable.id); // Consistent ordering

  // Process the fetched data into the structure expected by ActionItemsTable
  const actionItemsFormatted: CategoryWithItems[] = [];
  const categoryMap = new Map<string, { name: string; items: Map<string, { actionItem: string; nextSteps: Set<string> }> }>();

  for (const row of userCategories) {
    if (!row.categoryId || !row.actionItemId) continue; // Skip if no action item

    let category = categoryMap.get(row.categoryId);
    if (!category) {
      category = { name: row.categoryName!, items: new Map() };
      categoryMap.set(row.categoryId, category);
    }

    let actionItem = category.items.get(row.actionItemId);
    if (!actionItem) {
      actionItem = { actionItem: row.actionItemText!, nextSteps: new Set() };
      category.items.set(row.actionItemId, actionItem);
    }

    if (row.nextStepText) {
      actionItem.nextSteps.add(row.nextStepText);
    }
  }

  // Convert maps to the final array structure
  categoryMap.forEach(categoryData => {
    const itemsArray: NextStep[] = [];
    categoryData.items.forEach(itemData => {
      itemsArray.push({ actionItem: itemData.actionItem, nextSteps: Array.from(itemData.nextSteps) });
    });
    // Sort items within category if needed, e.g., by actionItem text
    // itemsArray.sort((a, b) => a.actionItem.localeCompare(b.actionItem)); 
    actionItemsFormatted.push({ name: categoryData.name, items: itemsArray });
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

          {/* === Display Fetched Action Items === */}
          {actionItemsFormatted.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Action Items</CardTitle>
              </CardHeader>
              <CardContent>
                 {/* Pass the server-fetched data */}
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