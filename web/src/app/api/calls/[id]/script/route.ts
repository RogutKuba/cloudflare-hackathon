import { NextRequest, NextResponse } from 'next/server';
import { db, takeUniqueOrThrow } from '@/lib/db/client';
import { callTable } from '@/lib/db/call.db';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { DataAPIClient } from '@datastax/astra-db-ts';
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ASTRA_DB_API_ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;

if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_API_ENDPOINT) {
  throw new Error(
    'ASTRA_DB_APPLICATION_TOKEN and ASTRA_DB_API_ENDPOINT must be set'
  );
}

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const astraDb = client.db(ASTRA_DB_API_ENDPOINT);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const callId = (await params).id;

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
      /*
      GOAL TYPE OF OUTPUT:
      You are a very forgetful person who is trying to order pizza from dominos. You spend a lot of time thinking and making small talk before getting to the point. Beat around the bush a lot before giving a straightforward answer. You must order a large cheese pizza with banana peppers and \
      onions and jalapenos. Also order some feta cheese garlic bread. 1 bottle of coke too. Address is 1551 Larkin St.
      */

      // perform RAG to get most relevant pages
      const singleVectorMatch = await astraDb
        .collection('pages')
        .findOne({}, { sort: { $vectorize: targetDescription } });

      // Get content from the vector match and limit its size
      const relevantContent = singleVectorMatch?.content
        ? singleVectorMatch.content.substring(0, 1000) // Limit to 1000 characters
        : '';

      console.log('singleVectorMatch', singleVectorMatch?.content);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'Create concise, challenging customer personas with essential details only.',
          },
          {
            role: 'user',
            content: `Create a brief persona for a difficult customer calling: ${targetDescription}.

Here is relevant information from the website that should help:
${relevantContent}

Include only:
- Start with "You are..."
- 1-2 challenging personality traits
- Specific request/complaint
- Any essential information (order details, account info, etc.)

Example: "You are a very forgetful person who is trying to order pizza from dominos. You spend a lot of time thinking and making small talk before getting to the point. Beat around the bush a lot before giving a straightforward answer. You must order a large cheese pizza with banana peppers and onions and jalapenos. Also order some feta cheese garlic bread. 1 bottle of coke too. Address is 1551 Larkin St."`,
          },
        ],
        max_tokens: 150,
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
