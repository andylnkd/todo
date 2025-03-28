import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

const PROMPT = `
Analyze this transcript and:
1. Extract actionable items
2. Group them by category/theme
3. For each action item, provide specific next steps
4. Format the response as a JSON object with this structure:
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
`;

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([PROMPT, transcript]);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    const actionItems = JSON.parse(text);

    return NextResponse.json(actionItems);
  } catch (error) {
    console.error('Transcript processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript' },
      { status: 500 }
    );
  }
} 