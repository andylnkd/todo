import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../drizzle/db'; // Import drizzle client
import * as schema from '../../../drizzle/schema'; // Import schema
import { v4 as uuidv4 } from 'uuid'; // For generating IDs if needed (optional)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const PROMPT = `
You are a task extraction assistant. Your job is to analyze the given transcript and:
1. Extract actionable items
2. Group them by logical categories/themes
3. For each action item, provide specific, concrete next steps

IMPORTANT: Your response MUST be a valid JSON object with NO markdown formatting or additional text.
Use this exact structure:
{
  "categories": [
    {
      "name": "string",
      "items": [
        {
          "actionItem": "string",
          "nextSteps": ["string"]
        }
      ]
    }
  ]
}

REQUIREMENTS:
- Return ONLY the JSON object, no other text or formatting
- No markdown code blocks, no backticks
- Each category must have at least one action item
- Each action item must have at least one next step
- If no action items found, return {"categories": []}
`;

interface ActionItem { 
  actionItem: string;
  nextSteps: string[];
}

interface Category {
  name: string;
  items: ActionItem[];
}

interface ParsedResponse {
  categories: Category[];
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let transcript = '';
  let transcriptionId: string | null = null; // To link action items

  try {
    const body = await request.json();
    transcript = body.transcript; // Assume transcript is passed directly

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    // 1. Save the original transcript first (optional but good practice)
    const newTranscription = await db
      .insert(schema.transcriptions)
      .values({
        text: transcript,
        userId: userId,
        // audioUrl: // Add if you store the audio file URL
      })
      .returning({ id: schema.transcriptions.id });
    
    transcriptionId = newTranscription[0]?.id;
    
    if (!transcriptionId) {
        throw new Error('Failed to save transcription record.');
    }

    // 2. Process with AI
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Updated to 2.0

    const result = await model.generateContent([PROMPT, transcript]);
    const response = await result.response;
    let text = response.text();

    // 3. Parse and Validate AI Response
    let parsedData: ParsedResponse;
    try {
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }
      parsedData = JSON.parse(text);

      // Basic validation
      if (!parsedData.categories || !Array.isArray(parsedData.categories)) {
        throw new Error('Invalid response: missing or invalid categories array');
      }
      // Add more detailed validation if needed

    } catch (parseError) {
      console.error('AI Response Parsing Error:', parseError);
      console.error('Original AI response text:', text);
      return NextResponse.json(
        { error: 'Failed to parse action items from AI response', details: parseError instanceof Error ? parseError.message : String(parseError) },
        { status: 500 }
      );
    }

    // 4. Save Action Items to Database using a Transaction
    await db.transaction(async (tx) => {
      for (const category of parsedData.categories) {
        // Insert Category
        const insertedCategory = await tx
          .insert(schema.categories)
          .values({ 
              name: category.name, 
              userId: userId 
           })
          .returning({ id: schema.categories.id });
        
        const categoryId = insertedCategory[0]?.id;
        if (!categoryId) throw new Error(`Failed to insert category: ${category.name}`);

        for (const item of category.items) {
          // Insert Action Item
          const insertedActionItem = await tx
            .insert(schema.actionItems)
            .values({
              categoryId: categoryId,
              actionItem: item.actionItem,
              userId: userId,
              transcriptionId: transcriptionId!, // Link to the saved transcript
              status: 'pending',
            })
            .returning({ id: schema.actionItems.id });
          
          const actionItemId = insertedActionItem[0]?.id;
           if (!actionItemId) throw new Error(`Failed to insert action item: ${item.actionItem}`);

          // Insert Next Steps
          if (item.nextSteps && item.nextSteps.length > 0) {
            const nextStepsValues = item.nextSteps.map(step => ({
              actionItemId: actionItemId,
              step: step,
              userId: userId,
              completed: false,
            }));
            await tx.insert(schema.nextSteps).values(nextStepsValues);
          }
        }
      }
    });

    // Return the processed data (same as before, or maybe fetch from DB?)
    return NextResponse.json(parsedData); // For now, return the AI response

  } catch (error) {
    console.error('Transcript Processing Error:', error);
    // Consider logging the transcript that caused the error
    // console.error('Failed transcript:', transcript);
    return NextResponse.json(
      { error: 'Failed to process transcript and save action items', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 