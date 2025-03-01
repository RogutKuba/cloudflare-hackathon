import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { asc, desc, eq } from 'drizzle-orm';
import { callEventTable } from '@/lib/db/callEvent.db';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const callId = (await params).id;

    // Fetch all events for the specified call
    const events = await db
      .select()
      .from(callEventTable)
      .where(eq(callEventTable.call_id, callId))
      .orderBy(asc(callEventTable.timestamp));

    return NextResponse.json(events, { status: 200 });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
