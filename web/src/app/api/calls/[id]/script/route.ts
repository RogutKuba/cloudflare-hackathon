import { NextRequest, NextResponse } from 'next/server';
import { db, takeUniqueOrThrow } from '@/lib/db/client';
import { callTable } from '@/lib/db/call.db';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callId = params.id;

    // Fetch the call data from the database
    const call = await db
      .select()
      .from(callTable)
      .where(eq(callTable.id, callId))
      .then(takeUniqueOrThrow);

    // Generate persona based on call target
    const targetDescription = call.target || '';
    let persona = '';

    if (targetDescription) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an assistant that creates concise voice agent personas.',
          },
          {
            role: 'user',
            content: `Create a brief persona for a voice agent that will be calling the following target: ${targetDescription}. Include tone, speaking style, and personality traits. Keep it under 100 words.`,
          },
        ],
        max_tokens: 200,
      });

      persona = completion.choices[0]?.message?.content || '';
    }

    return NextResponse.json({
      callId,
      persona,
    });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    );
  }
}
