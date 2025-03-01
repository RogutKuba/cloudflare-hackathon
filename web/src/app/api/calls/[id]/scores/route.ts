import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { desc, eq } from 'drizzle-orm';
import { callScoreTable } from '@/lib/db/callScore.db';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const callId = (await params).id;

    // Fetch all scores for the specified call
    const scores = await db
      .select()
      .from(callScoreTable)
      .where(eq(callScoreTable.call_id, callId))
      .orderBy(desc(callScoreTable.timestamp))
      .limit(25);

    return NextResponse.json(scores, { status: 200 });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}
