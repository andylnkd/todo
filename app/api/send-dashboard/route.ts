import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { DashboardEmail } from '../../components/emails/DashboardEmail';
import { getFormattedActionItems } from '@/app/lib/data';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL;

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
    const userEmail = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId)?.emailAddress; 
    const userFirstName = user.firstName;

    if (!userEmail) {
      return NextResponse.json({ error: 'Primary email address not found for user.' }, { status: 400 });
    }

    // Get additional emails from request body (optional)
    let additionalEmails: string[] = [];
    try {
      const body: { emails?: string[] } = await request.json();
      if (body.emails && Array.isArray(body.emails)) {
        additionalEmails = body.emails.filter((email: string) => typeof email === 'string' && isValidEmail(email));
      }
    } catch {
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