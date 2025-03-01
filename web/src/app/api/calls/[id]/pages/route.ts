import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { asc, desc, eq } from 'drizzle-orm';
import { pagesTable } from '@/lib/db/page.db';
import { DataAPIClient } from '@datastax/astra-db-ts';

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN;
const ASTRA_DB_API_ENDPOINT = process.env.ASTRA_DB_API_ENDPOINT;

if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_API_ENDPOINT) {
  throw new Error(
    'ASTRA_DB_APPLICATION_TOKEN and ASTRA_DB_API_ENDPOINT must be set'
  );
}

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const astraDb = client.db(ASTRA_DB_API_ENDPOINT);

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const callId = (await params).id;

    // Fetch all events for the specified call
    const pages = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.callId, callId))
      .orderBy(asc(pagesTable.createdAt));

    // perform RAG to get most relevant pages
    const singleVectorMatch = await astraDb
      .collection('pages')
      .findOne({}, { sort: { $vectorize: 'Dominos Pizza' } });

    // Get content from the vector match and limit its size
    const relevantContent = singleVectorMatch?.content
      ? singleVectorMatch.content.substring(0, 1000) // Limit to 1000 characters
      : '';

    return NextResponse.json(pages, { status: 200 });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
