// Remove 'use client';

// Import server-side dependencies
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Correct import for server components
import { redirect } from 'next/navigation';
import { db } from '../../drizzle/db'; // Corrected path
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../drizzle/schema'; // Corrected path
import { eq, and } from 'drizzle-orm';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Import components
import ActionItemsTable from '../components/ActionItemsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SendDashboardButton from '../components/SendDashboardButton'; // Use relative path
import CopyMarkdownButton from '../components/CopyMarkdownButton'; // Import the new button
import RefineListWrapper from '../components/RefineListWrapper'; // Add this import
import SendWhatsAppButton from '../components/SendWhatsAppButton';
import { SelectedItemsProvider } from '../context/SelectedItemsContext';
import { CombineCategoriesButton } from '@/app/components/CombineCategoriesButton';
import InputHub from '../components/InputHub'; // Import the new InputHub
import InstallAppButton from '../components/InstallAppButton';

// Server actions moved to app/server-actions/dashboardActions.ts

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
              <InstallAppButton />
              <Link href="/daily"><Button variant="outline">Daily Dump</Button></Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <InputHub
              categories={allCategories}
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
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SelectedItemsProvider>
  );
} 
