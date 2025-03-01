import { db } from '@/lib/db/client';
import { callTable } from '@/lib/db/call.db';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

// GET handler to retrieve call entities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    // Get the id from the path parameters

    console.log({ id });

    if (id) {
      // If an ID is provided, get a specific call
      const call = await db
        .select()
        .from(callTable)
        .where(eq(callTable.id, id))
        .limit(1);

      if (call.length === 0) {
        return NextResponse.json({ error: 'Call not found' }, { status: 404 });
      }

      return NextResponse.json(call[0]);
    } else {
      // Otherwise, get all calls
      const allCalls = await db.select().from(callTable);
      return NextResponse.json(allCalls);
    }
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}

// POST handler to create a new call entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    // Add your validation logic here based on your schema requirements

    // Insert the new call into the database
    const newCall = await db.insert(callTable).values(body).returning();

    return NextResponse.json(newCall[0], { status: 201 });
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json(
      { error: 'Failed to create call' },
      { status: 500 }
    );
  }
}
