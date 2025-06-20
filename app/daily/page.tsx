import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../drizzle/db';
import * as schema from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { Card, CardContent } from '@/components/ui/card';
import { processTranscriptAndSave } from '@/app/server-actions/transcriptActions';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import InputHub from '../components/InputHub';

// Helper to get start and end of today
function getTodayTimestamps() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function addCategoryForDaily(name: string): Promise<string | null> {
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

async function addActionItemForDaily(categoryId: string, text: string) {
  'use server';
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  await db.insert(schema.actionItems).values({ categoryId, actionItem: text, userId, type: 'daily' });
  revalidatePath('/daily');
}

async function handleImageUploadedForDaily(file: File) {
  'use server';
  console.log('Received image on daily page:', file.name, file.size);
  // TODO: Implement image processing for daily items
  revalidatePath('/daily');
}

export default async function DailyPage() {
  const { userId } = await auth();
  if (!userId) {
    return <p className="p-4 text-center text-red-500">Please sign in to view this page.</p>;
  }

  const { start, end } = getTodayTimestamps();

  const dailyItems = await db
    .select({
      id: schema.actionItems.id,
      actionItem: schema.actionItems.actionItem,
      status: schema.actionItems.status,
      createdAt: schema.actionItems.createdAt,
    })
    .from(schema.actionItems)
    .where(
      and(
        eq(schema.actionItems.userId, userId),
        eq(schema.actionItems.type, 'daily'),
        gte(schema.actionItems.createdAt, start),
        lte(schema.actionItems.createdAt, end)
      )
    )
    .orderBy(schema.actionItems.createdAt);

  // Fetch categories for the InputHub dropdown
  const allCategories = await db.query.categories.findMany({
    where: eq(schema.categories.userId, userId)
  });

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

  async function toggleDailyItemStatus(id: string, status: string) {
    'use server';
    if (!userId) throw new Error('User not authenticated');
    await db.update(schema.actionItems)
      .set({ status: status === 'pending' ? 'completed' : 'pending', updatedAt: new Date() })
      .where(and(eq(schema.actionItems.id, id), eq(schema.actionItems.userId, userId)));
    revalidatePath('/daily');
  }

  async function deleteDailyItem(id: string) {
    'use server';
    if (!userId) throw new Error('User not authenticated');
    // First delete all next steps for this action item
    await db.delete(schema.nextSteps)
      .where(and(eq(schema.nextSteps.actionItemId, id), eq(schema.nextSteps.userId, userId)));
    // Then delete the action item
    await db.delete(schema.actionItems)
      .where(and(eq(schema.actionItems.id, id), eq(schema.actionItems.userId, userId)));
    revalidatePath('/daily');
  }

  return (
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
        <div className="max-w-2xl mx-auto space-y-8">
          <InputHub
            categories={allCategories}
            onTranscriptProcessed={handleDailyTranscriptProcessed}
            onAddCategory={addCategoryForDaily}
            onAddActionItem={addActionItemForDaily}
            onImageUploaded={handleImageUploadedForDaily}
          />
          
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-semibold text-gray-700">Today&apos;s Entries ({dailyItems.length})</h2>
            {dailyItems.length > 0 ? (
              <div className="space-y-4">
                {dailyItems.map((item) => (
                  <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <form action={async () => { 'use server'; await toggleDailyItemStatus(item.id, item.status); }}>
                          <button type="submit">
                            <Checkbox checked={item.status === 'completed'} className="border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                          </button>
                        </form>
                        <p className={cn("flex-1 text-gray-800 text-base break-words", item.status === 'completed' && 'line-through text-muted-foreground')}>{item.actionItem}</p>
                        <form action={async () => { 'use server'; await deleteDailyItem(item.id); }}>
                          <Button type="submit" variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </form>
                      </div>
                      <div className="mt-2 pl-0 sm:pl-0 flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-gray-500">
                        <p>
                          Status: <span className={`font-medium ${item.status === 'pending' ? 'text-orange-500' : 'text-green-500'}`}>{item.status}</span>
                        </p>
                        <p className="mt-1 sm:mt-0">
                          Added: {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow bg-white">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">
                    No daily items logged yet for today. Use the recorder above to add some!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 