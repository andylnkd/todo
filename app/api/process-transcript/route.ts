import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from '@clerk/nextjs/server';

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

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
    
    const result = await model.generateContent([PROMPT, transcript]);
    const response = await result.response;
    let text = response.text();
    
    // Clean up the response text
    try {
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?|\n?```/g, '');
      
      // Try to extract JSON using regex if the text contains extra content
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[0];
      }

      // Parse the cleaned text
      const actionItems = JSON.parse(text);
      
      // Validate the response structure
      if (!actionItems.categories || !Array.isArray(actionItems.categories)) {
        throw new Error('Invalid response structure: missing or invalid categories array');
      }

      // Validate each category and its items
      actionItems.categories.forEach((category: any, index: number) => {
        if (!category.name || !category.items || !Array.isArray(category.items)) {
          throw new Error(`Invalid category structure at index ${index}`);
        }
        
        category.items.forEach((item: any, itemIndex: number) => {
          if (!item.actionItem || !item.nextSteps || !Array.isArray(item.nextSteps)) {
            throw new Error(`Invalid action item structure in category "${category.name}" at index ${itemIndex}`);
          }
        });
      });

      return NextResponse.json(actionItems);
    } catch (parseError) {
      console.error('Original response:', text);
      console.error('JSON parsing error:', parseError);

      // If parsing fails, try to force a valid response format
      try {
        const fallbackResponse = {
          categories: [{
            name: "General",
            items: [{
              actionItem: text.substring(0, 200), // Take the first 200 chars as an action item
              nextSteps: ["Review and organize this content manually"]
            }]
          }]
        };
        return NextResponse.json(fallbackResponse);
      } catch (fallbackError) {
        return NextResponse.json(
          { error: 'Failed to parse model response', details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Transcript processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 