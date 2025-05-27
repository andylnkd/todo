import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../drizzle/db';
import * as schema from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import AudioRecorderWrapper from '../components/AudioRecorderWrapper';
import { revalidatePath } from 'next/cache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Helper to get start and end of today
function getTodayTimestamps() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
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

  async function handleDailyTranscriptProcessed(transcript: string) {
    'use server';
    if (!userId) throw new Error('User not authenticated');
    const response = await fetch(new URL('/api/process-transcript', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: transcript, type: 'daily' }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process daily transcript');
    }
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
          <AudioRecorderWrapper onTranscriptProcessed={handleDailyTranscriptProcessed} />
          
          <div className="space-y-6 pt-4">
            <h2 className="text-xl font-semibold text-gray-700">Today's Entries ({dailyItems.length})</h2>
            {dailyItems.length > 0 ? (
              <div className="space-y-4">
                {dailyItems.map((item) => (
                  <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow bg-white">
                    <CardContent className="p-4">
                      <p className="text-gray-800 text-base break-words">{item.actionItem}</p>
                      <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <p className="text-xs text-gray-500">
                          Status: <span className={`font-medium ${item.status === 'pending' ? 'text-orange-500' : 'text-green-500'}`}>{item.status}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1 sm:mt-0">
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