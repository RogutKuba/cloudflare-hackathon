import { db, takeUnique, takeUniqueOrThrow } from '@/lib/db/client';
import { callTable } from '@/lib/db/call.db';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET handler to retrieve call entities
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    // Get the id from the path parameters

    // If an ID is provided, get a specific call
    const call = await db
      .select()
      .from(callTable)
      .where(eq(callTable.id, id))
      .then(takeUnique);

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}
