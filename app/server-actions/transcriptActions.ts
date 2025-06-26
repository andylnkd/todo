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

export const TASK_EXTRACTION_PROMPT = `
You are a task extraction assistant. Your job is to analyze the given input and:
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
  const result = await model.generateContent([TASK_EXTRACTION_PROMPT, transcript]);
  const response = await result.response;
  let aiResponseText = response.text();

  // 3. Parse and Validate AI Response
  const parsedData: ParsedTranscriptResponse = (() => {
    aiResponseText = aiResponseText.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResponseText = jsonMatch[0];
    }
    return JSON.parse(aiResponseText);
  })();
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
        const valuesToInsert: {
          categoryId: string;
          actionItem: string;
          userId: string;
          transcriptionId: string;
          status: 'pending' | 'completed';
          type?: string;
        } = {
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
 * NEW: Takes an image file, extracts action items, processes them with AI, and saves to DB.
 * @param image - The base64 data URL of the image.
 * @param mimeType - The MIME type of the image.
 * @param userId - The ID of the user.
 * @param itemType - The type of item ('daily' or 'regular').
 */
export async function processImageAndSave({
  image,
  mimeType,
  userId,
  itemType,
}: {
  image: string; // Now a base64 data URL
  mimeType: string;
  userId: string;
  itemType: 'daily' | 'regular';
}) {
  // The Gemini SDK can handle the blob directly, no need for buffer/upload dance for this model.
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = TASK_EXTRACTION_PROMPT;
  
  // The base64 string from the client includes the data URI prefix (e.g., "data:image/png;base64,"), 
  // which needs to be removed before sending to the Gemini API.
  const base64Data = image.split(',')[1];

  if (!base64Data) {
    throw new Error("Invalid base64 image data provided.");
  }

  const result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: mimeType } }]);
  const response = await result.response;
  const text = response.text();

  if (!text || text.trim() === '') {
    console.log("No items found in image, skipping further processing.");
    return; // Or return a specific message
  }

  // Step 2: Join the extracted items into a single transcript string.
  const transcript = text;

  // Step 3: Use the existing processTranscriptAndSave function to categorize and save.
  await processTranscriptAndSave({
    transcript,
    userId,
    itemType,
  });
}

// Helper functions for enhanceItemOrCategory
export async function enhanceActionItem({
  id,
  transcript,
  userId,
}: {
  id: string;
  transcript: string;
  userId: string;
}) {
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
  console.log('[enhanceActionItem] fetched action item:', item);
  console.log('[enhanceActionItem] fetched next steps:', nextSteps);

  // 2. Prepare LLM prompt
  const prompt = `You are an assistant helping to update a task.\nCurrent description: ${item.actionItem}\nCurrent next steps: ${nextSteps.map(ns => ns.step).join('; ')}\nNew user input: ${transcript}\nPlease return an updated description and next steps that incorporate the new information.\nReturn as JSON: {"description": string, "nextSteps": string[]}`;

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
  console.log('[enhanceActionItem] LLM raw response:', aiResponseText);
  const parsed = JSON.parse(aiResponseText);
  console.log('[enhanceActionItem] LLM parsed response:', parsed);

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
  console.log('[enhanceActionItem] DB appended next steps for action item', id);
  return parsed;
}

export async function enhanceCategory({
  id,
  transcript,
  userId,
}: {
  id: string;
  transcript: string;
  userId: string;
}) {
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
  console.log('[enhanceCategory] fetched category:', category);
  console.log('[enhanceCategory] fetched items for category:', items);

  // 2. Prepare LLM prompt
  const prompt = `You are an assistant helping to update a category of tasks.\nCurrent category name: ${category.name}\nCurrent items: ${items.map(i => i.actionItem).join('; ')}\nNew user input: ${transcript}\nPlease return an updated category name (if needed), and an updated list of items that incorporate the new information.\nReturn as JSON: {"categoryName": string, "items": string[]}`;

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
  console.log('[enhanceCategory] LLM raw response:', aiResponseText);
  const parsed = JSON.parse(aiResponseText);
  console.log('[enhanceCategory] LLM parsed response:', parsed);

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
  console.log('[enhanceCategory] DB appended items for category', id);
  return parsed;
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
  if (type === 'actionItem') {
    return await enhanceActionItem({ id, transcript, userId });
  } else if (type === 'category') {
    return await enhanceCategory({ id, transcript, userId });
  } else {
    throw new Error('Invalid type');
  }
}

/**
 * Save extracted items as a new category and action items (from image extraction, etc.)
 */
export async function processExtractedItemsAndSave({
  items,
  userId,
  categoryName = 'Extracted from Image',
}: {
  items: string[];
  userId: string;
  categoryName?: string;
}) {
  console.log(`Processing ${items.length} extracted items for user ${userId}`);

  if (!items || items.length === 0) {
    console.log("No items to save.");
    return;
  }
  
  // Find or create the category for these items
  const category = await db.query.categories.findFirst({
    where: (categories, { and, eq }) => and(
      eq(categories.userId, userId),
      eq(categories.name, categoryName)
    ),
  });

  let categoryId: string;
  if (category) {
    categoryId = category.id;
  }
  else {
    console.log(`Category "${categoryName}" not found, creating it.`);
    const [newCategory] = await db.insert(schema.categories)
      .values({ name: categoryName, userId: userId })
      .returning({ id: schema.categories.id });
    categoryId = newCategory.id;
  }

  if (!categoryId) {
    throw new Error('Could not find or create a category for the items.');
  }

  // Prepare and insert all action items
  const actionItemsToInsert = items.map((itemText) => ({
    categoryId: categoryId,
    actionItem: itemText,
    userId: userId,
    status: 'pending', // Default status
    // Note: 'type' is not specified here, it will use the DB default ('regular')
  }));

  if (actionItemsToInsert.length > 0) {
    console.log(`Inserting ${actionItemsToInsert.length} action items into category ${categoryId}`);
    await db.insert(schema.actionItems).values(actionItemsToInsert);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const FLAT_EXTRACTION_PROMPT = `
You are a task extraction assistant. Your job is to analyze the given input and:
1. Extract actionable items
2. Return ONLY a flat JSON array of action item strings.

IMPORTANT: Your response MUST be a valid JSON array with NO markdown formatting or additional text.
Example: ["Send email to John", "Follow up on the report"]
If no action items found, return an empty array [].
`;

export const CATEGORY_MERGE_PROMPT = `
I have {numCategories} categories to merge. Please suggest a concise, descriptive name for the combined category.

Categories:
{categoriesList}

Return ONLY the suggested name, nothing else.
`;