// This file contains server-side actions/logic related to transcript processing.

// Defensive check for required environment variable
if (!process.env.GEMINI_API_KEY) {
  throw new Error('[transcriptActions] GEMINI_API_KEY environment variable is not set!');
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../../drizzle/db'; 
import * as schema from '../../drizzle/schema';

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

interface ActionItemForDB { 
  actionItem: string;
  nextSteps: string[];
}

interface CategoryForDB {
  name: string;
  items: ActionItemForDB[];
}

export interface ParsedTranscriptResponse {
  categories: CategoryForDB[];
}

interface ProcessTranscriptParams {
  transcript: string;
  userId: string;
  itemType?: string; // 'daily' or 'regular' (defaults to regular in DB schema)
}

export async function processTranscriptAndSave({ 
  transcript,
  userId,
  itemType,
}: ProcessTranscriptParams): Promise<ParsedTranscriptResponse> {
  let transcriptionId: string | null = null;

  // 1. Save the original transcript first
  const newTranscription = await db
    .insert(schema.transcriptions)
    .values({
      text: transcript,
      userId: userId,
    })
    .returning({ id: schema.transcriptions.id });
  transcriptionId = newTranscription[0]?.id;
  if (!transcriptionId) {
    throw new Error('Failed to save transcription record.');
  }

  // 2. Process with AI
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent([PROMPT, transcript]);
  const response = await result.response;
  let aiResponseText = response.text();

  // 3. Parse and Validate AI Response
  let parsedData: ParsedTranscriptResponse;
  aiResponseText = aiResponseText.replace(/```json\n?|\n?```/g, '').trim();
  const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    aiResponseText = jsonMatch[0];
  }
  parsedData = JSON.parse(aiResponseText);
  if (!parsedData.categories || !Array.isArray(parsedData.categories)) {
    throw new Error('Invalid response from AI: missing or invalid categories array');
  }

  // 4. Save Action Items to Database using a Transaction
  await db.transaction(async (tx) => {
    for (const category of parsedData.categories) {
      const insertedCategory = await tx
        .insert(schema.categories)
        .values({ name: category.name, userId: userId })
        .returning({ id: schema.categories.id });
      const categoryId = insertedCategory[0]?.id;
      if (!categoryId) throw new Error(`Failed to insert category: ${category.name}`);

      for (const item of category.items) {
        const valuesToInsert: any = {
          categoryId: categoryId,
          actionItem: item.actionItem,
          userId: userId,
          transcriptionId: transcriptionId!,
          status: 'pending',
        };
        if (itemType) {
          valuesToInsert.type = itemType;
        }
        const insertedActionItem = await tx
          .insert(schema.actionItems)
          .values(valuesToInsert)
          .returning({ id: schema.actionItems.id });
        const actionItemId = insertedActionItem[0]?.id;
        if (!actionItemId) throw new Error(`Failed to insert action item: ${item.actionItem}`);

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

  return parsedData;
} 