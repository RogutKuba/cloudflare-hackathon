import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { asc, desc, eq } from 'drizzle-orm';
import { pagesTable } from '@/lib/db/page.db';

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

    return NextResponse.json(pages, { status: 200 });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}
