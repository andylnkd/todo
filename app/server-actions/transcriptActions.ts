// This file contains server-side actions/logic related to transcript processing.

// Defensive check for required environment variable
if (!process.env.GEMINI_API_KEY) {
  throw new Error('[transcriptActions] GEMINI_API_KEY environment variable is not set!');
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from '../../drizzle/db'; 
import * as schema from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

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

/**
 * Enhance an action item or category with new audio transcript.
 * @param id - The action item or category ID
 * @param type - 'actionItem' or 'category'
 * @param transcript - The new transcript
 * @param userId - The user ID
 */
export async function enhanceItemOrCategory({
  id,
  type,
  transcript,
  userId,
}: {
  id: string;
  type: 'actionItem' | 'category';
  transcript: string;
  userId: string;
}) {
  console.log('[enhanceItemOrCategory] called', { id, type, userId });
  if (type === 'actionItem') {
    // Fetch the action item and its next steps
    const [item] = await db
      .select({
        id: schema.actionItems.id,
        actionItem: schema.actionItems.actionItem,
        categoryId: schema.actionItems.categoryId,
        status: schema.actionItems.status,
      })
      .from(schema.actionItems)
      .where(eq(schema.actionItems.id, id));
    const nextSteps = await db
      .select({
        id: schema.nextSteps.id,
        step: schema.nextSteps.step,
        completed: schema.nextSteps.completed,
      })
      .from(schema.nextSteps)
      .where(eq(schema.nextSteps.actionItemId, id));
    if (!item) throw new Error('Action item not found');
    console.log('[enhanceItemOrCategory] fetched action item:', item);
    console.log('[enhanceItemOrCategory] fetched next steps:', nextSteps);

    // 2. Prepare LLM prompt
    const prompt = `You are an assistant helping to update a task.\nCurrent description: ${item.actionItem}\nCurrent next steps: ${nextSteps.map(ns => ns.step).join('; ')}\nNew user input: ${transcript}\nPlease return an updated description and next steps that incorporate the new information.\nReturn as JSON: {\"description\": string, \"nextSteps\": string[]}`;

    // 3. Call LLM
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    let aiResponseText = response.text();
    aiResponseText = aiResponseText.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResponseText = jsonMatch[0];
    }
    console.log('[enhanceItemOrCategory] LLM raw response:', aiResponseText);
    const parsed = JSON.parse(aiResponseText);
    console.log('[enhanceItemOrCategory] LLM parsed response:', parsed);

    // 4. Append new next steps (do not delete existing)
    const existingSteps = nextSteps.map(ns => ns.step.trim().toLowerCase());
    const newSteps = (Array.isArray(parsed.nextSteps) ? parsed.nextSteps : []).filter(
      (step: string) => !existingSteps.includes(step.trim().toLowerCase())
    );
    await db.update(schema.actionItems)
      .set({ actionItem: parsed.description, updatedAt: new Date() })
      .where(eq(schema.actionItems.id, id));
    if (newSteps.length > 0) {
      await db.insert(schema.nextSteps).values(
        newSteps.map((step: string) => ({
          actionItemId: id,
          step,
          userId,
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }
    console.log('[enhanceItemOrCategory] DB appended next steps for action item', id);
    return parsed;
  } else if (type === 'category') {
    // Fetch the category and all its items/steps
    const [category] = await db
      .select({
        id: schema.categories.id,
        name: schema.categories.name,
      })
      .from(schema.categories)
      .where(eq(schema.categories.id, id));
    const items = await db
      .select({
        id: schema.actionItems.id,
        actionItem: schema.actionItems.actionItem,
      })
      .from(schema.actionItems)
      .where(eq(schema.actionItems.categoryId, id));
    if (!category) throw new Error('Category not found');
    console.log('[enhanceItemOrCategory] fetched category:', category);
    console.log('[enhanceItemOrCategory] fetched items:', items);

    // 2. Prepare LLM prompt
    const prompt = `You are an assistant helping to update a category of tasks.\nCurrent category name: ${category.name}\nCurrent items: ${items.map(i => i.actionItem).join('; ')}\nNew user input: ${transcript}\nPlease return an updated category name (if needed), and an updated list of items that incorporate the new information.\nReturn as JSON: {\"categoryName\": string, \"items\": string[]}`;

    // 3. Call LLM
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    let aiResponseText = response.text();
    aiResponseText = aiResponseText.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResponseText = jsonMatch[0];
    }
    console.log('[enhanceItemOrCategory] LLM raw response:', aiResponseText);
    const parsed = JSON.parse(aiResponseText);
    console.log('[enhanceItemOrCategory] LLM parsed response:', parsed);

    // 4. Append new action items (do not delete existing)
    if (parsed.categoryName && parsed.categoryName !== category.name) {
      await db.update(schema.categories)
        .set({ name: parsed.categoryName, updatedAt: new Date() })
        .where(eq(schema.categories.id, id));
    }
    const existingItems = items.map(i => i.actionItem.trim().toLowerCase());
    const newItems = (Array.isArray(parsed.items) ? parsed.items : []).filter(
      (item: string) => !existingItems.includes(item.trim().toLowerCase())
    );
    if (newItems.length > 0) {
      await db.insert(schema.actionItems).values(
        newItems.map((actionItem: string) => ({
          categoryId: id,
          actionItem,
          userId,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          type: 'regular',
        }))
      );
    }
    console.log('[enhanceItemOrCategory] DB appended items for category', id);
    return parsed;
  } else {
    throw new Error('Invalid type');
  }
} 