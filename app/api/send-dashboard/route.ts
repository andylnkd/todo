import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { db } from '../../../drizzle/db';
import { categories as categoriesTable, actionItems as actionItemsTable, nextSteps as nextStepsTable } from '../../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { DashboardEmail } from '../../components/emails/DashboardEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL;

// Helper function to fetch and structure data (similar to dashboard page)
async function getFormattedActionItems(userId: string) {
  const userCategories = await db
    .select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      actionItemId: actionItemsTable.id,
      actionItemText: actionItemsTable.actionItem,
      nextStepText: nextStepsTable.step,
      actionItemCreatedAt: actionItemsTable.createdAt,
    })
    .from(categoriesTable)
    .leftJoin(actionItemsTable, eq(categoriesTable.id, actionItemsTable.categoryId))
    .leftJoin(nextStepsTable, eq(actionItemsTable.id, nextStepsTable.actionItemId))
    .where(eq(categoriesTable.userId, userId))
    .orderBy(desc(actionItemsTable.createdAt), categoriesTable.name, actionItemsTable.id, nextStepsTable.id);

  // Process the fetched data
  const categoryMap = new Map<string, { name: string; items: Map<string, { actionItem: string; nextSteps: Set<string> }> }>();
  for (const row of userCategories) {
    if (!row.categoryId || !row.actionItemId) continue;
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
  const actionItemsFormatted: { name: string; items: { actionItem: string; nextSteps: string[] }[] }[] = [];
  categoryMap.forEach(categoryData => {
    const itemsArray: { actionItem: string; nextSteps: string[] }[] = [];
    categoryData.items.forEach(itemData => {
      itemsArray.push({ actionItem: itemData.actionItem, nextSteps: Array.from(itemData.nextSteps) });
    });
    actionItemsFormatted.push({ name: categoryData.name, items: itemsArray });
  });
  actionItemsFormatted.sort((a, b) => a.name.localeCompare(b.name));
  return actionItemsFormatted;
}

// Validate email format (simple regex)
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !fromEmail) {
      console.error('Resend API Key or From Email not configured.');
      return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    // Get user details from Clerk 
    // Await the clerkClient() promise first, then access users
    const client = await clerkClient(); 
    const user = await client.users.getUser(userId); 
    const userEmail = user.emailAddresses.find((e: { id: string; emailAddress: string }) => e.id === user.primaryEmailAddressId)?.emailAddress; 
    const userFirstName = user.firstName;

    if (!userEmail) {
      return NextResponse.json({ error: 'Primary email address not found for user.' }, { status: 400 });
    }

    // Get additional emails from request body (optional)
    let additionalEmails: string[] = [];
    try {
      const body = await request.json();
      if (body.emails && Array.isArray(body.emails)) {
        additionalEmails = body.emails.filter((email: any) => typeof email === 'string' && isValidEmail(email));
      }
    } catch (e) {
       // Ignore if request body is empty or not valid JSON
       console.log("No valid additional emails in request body or invalid format.");
    }

    const allRecipients = [userEmail, ...additionalEmails];
    // Remove duplicates just in case
    const uniqueRecipients = [...new Set(allRecipients)];

    // Fetch the action items data
    const actionItemsData = await getFormattedActionItems(userId);

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `Voice Notes App <${fromEmail}>`,
      to: uniqueRecipients,
      subject: 'Your Voice Notes Action Items',
      react: DashboardEmail({ categories: actionItemsData, userFirstName: userFirstName || undefined }),
    });

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500 });
    }

    console.log('Resend Success:', data);
    return NextResponse.json({ message: 'Dashboard email sent successfully!', resendId: data?.id });

  } catch (error) {
    console.error('Send Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown internal server error' },
      { status: 500 }
    );
  }
} 