import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db';
import { nextSteps } from '../../../drizzle/schema'; // Use the nextSteps schema
import { eq, and } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Expecting 'id' of the next step and the new 'step' text
    const { id, step } = await request.json();
    if (!id || typeof step !== 'string') { // Basic validation
      return NextResponse.json({ error: 'Missing required fields (id, step)' }, { status: 400 });
    }

    // Update the specific next step
    const result = await db
      .update(nextSteps)
      .set({
        step: step,            // Update the text
        updatedAt: new Date() // Update the timestamp
      })
      .where(
        and(
          eq(nextSteps.id, id),          // Match the specific next step ID
          eq(nextSteps.userId, userId)  // Ensure the user owns this next step
        )
      )
      .returning({ id: nextSteps.id, step: nextSteps.step });

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Next step not found or unauthorized' }, { status: 404 });
    }

    // Return the updated next step details
    return NextResponse.json(result[0]);

  } catch (error) {
    console.error('Error updating next step:', error);
    return NextResponse.json({ error: 'Failed to update next step' }, { status: 500 });
  }
} 