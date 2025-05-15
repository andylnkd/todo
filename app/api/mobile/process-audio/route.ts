import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../../drizzle/db';
import * as schema from '../../../../drizzle/schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Debug logging function
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    log('📱 Mobile API: Received audio processing request', {
      url: request.url,
      method: request.method
    });
    
    // Log headers for debugging
    const authHeader = request.headers.get('authorization');
    log('🔑 Auth Header received:', { 
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader ? authHeader.substring(0, 15) + '...' : 'none',
      contentType: request.headers.get('content-type')
    });

    const { userId } = await auth();
    log('🔐 Auth check result:', { 
      userId,
      isAuthenticated: !!userId,
      headers: Object.fromEntries(request.headers.entries())
    });

    if (!userId) {
      log('❌ Authentication failed - no userId');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No valid authentication token provided' },
        { status: 401, headers: corsHeaders() }
      );
    }

    try {
      const formData = await request.formData();
      const audioFile = formData.get('audio');
      log('📁 Received form data', { 
        hasAudioFile: !!audioFile,
        audioFileType: audioFile instanceof Blob ? audioFile.type : typeof audioFile,
        audioFileSize: audioFile instanceof Blob ? audioFile.size : 'N/A',
        formDataKeys: Array.from(formData.keys())
      });

      if (!audioFile || !(typeof audioFile === 'object' && audioFile !== null && 'arrayBuffer' in audioFile)) {
        log('❌ Invalid audio file provided', {
          audioFile: audioFile ? 'exists' : 'missing',
          isBlob: typeof audioFile === 'object' && audioFile !== null && 'arrayBuffer' in audioFile
        });
        return NextResponse.json(
          { 
            error: 'Invalid audio file', 
            details: 'No valid audio file provided under the key "audio"',
            receivedKeys: Array.from(formData.keys())
          },
          { status: 400, headers: corsHeaders() }
        );
      }

      // Transcribe audio
      log('🎤 Starting audio transcription');
      const file = new File([audioFile], 'audio.webm', { type: audioFile.type });
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: "json"
      });
      const transcript = transcriptionResponse.text;
      log('✍️ Transcription completed', { transcriptLength: transcript.length });

      // Save transcript to DB
      log('💾 Saving transcript to database');
      const newTranscription = await db
        .insert(schema.transcriptions)
        .values({ text: transcript, userId })
        .returning({ id: schema.transcriptions.id });
      const transcriptionId = newTranscription[0]?.id;
      log('📝 Transcript saved', { transcriptionId });
      
      if (!transcriptionId) {
        log('❌ Failed to save transcription record');
        throw new Error('Failed to save transcription record.');
      }

      // Process transcript with Gemini
      log('🤖 Processing transcript with Gemini AI');
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent([PROMPT, transcript]);
      const response = await result.response;
      let text = response.text();
      log('🎯 Received AI response', { responseLength: text.length });

      // Parse and validate AI response
      log('🔍 Parsing AI response');
      let parsedData;
      try {
        text = text.replace(/```json\n?|\n?```/g, '').trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          text = jsonMatch[0];
        }
        parsedData = JSON.parse(text);
        log('✅ Successfully parsed AI response', { 
          categoriesCount: parsedData.categories?.length 
        });

        if (!parsedData.categories || !Array.isArray(parsedData.categories)) {
          log('❌ Invalid AI response structure');
          throw new Error('Invalid response: missing or invalid categories array');
        }
      } catch (parseError) {
        log('❌ Failed to parse AI response', { error: parseError });
        return NextResponse.json(
          { error: 'Failed to parse action items from AI response', details: parseError instanceof Error ? parseError.message : String(parseError) },
          { status: 500, headers: corsHeaders() }
        );
      }

      // Save action items to DB
      log('💾 Starting database transaction for action items');
      await db.transaction(async (tx) => {
        for (const category of parsedData.categories) {
          log('📁 Processing category', { categoryName: category.name });
          const insertedCategory = await tx
            .insert(schema.categories)
            .values({ name: category.name, userId })
            .returning({ id: schema.categories.id });
          const categoryId = insertedCategory[0]?.id;
          
          if (!categoryId) {
            log('❌ Failed to insert category', { categoryName: category.name });
            throw new Error(`Failed to insert category: ${category.name}`);
          }

          for (const item of category.items) {
            log('📝 Processing action item', { actionItem: item.actionItem });
            const insertedActionItem = await tx
              .insert(schema.actionItems)
              .values({
                categoryId,
                actionItem: item.actionItem,
                userId,
                transcriptionId,
                status: 'pending',
              })
              .returning({ id: schema.actionItems.id });
            const actionItemId = insertedActionItem[0]?.id;
            
            if (!actionItemId) {
              log('❌ Failed to insert action item', { actionItem: item.actionItem });
              throw new Error(`Failed to insert action item: ${item.actionItem}`);
            }

            if (item.nextSteps && item.nextSteps.length > 0) {
              log('📋 Processing next steps', { 
                actionItemId, 
                stepsCount: item.nextSteps.length 
              });
              const nextStepsValues = item.nextSteps.map((step: string) => ({
                actionItemId,
                step,
                userId,
                completed: false,
              }));
              await tx.insert(schema.nextSteps).values(nextStepsValues);
            }
          }
        }
      });
      log('✅ Database transaction completed successfully');

      log('🎉 Request completed successfully');
      return NextResponse.json({ transcript, actionItems: parsedData }, { headers: corsHeaders() });
    } catch (formDataError) {
      log('❌ Error parsing form data', { error: formDataError });
      return NextResponse.json(
        { error: 'Invalid form data', details: formDataError instanceof Error ? formDataError.message : 'Unknown error' },
        { status: 400, headers: corsHeaders() }
      );
    }

  } catch (error) {
    log('❌ Unhandled error in API route', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders() }
    );
  }
} 