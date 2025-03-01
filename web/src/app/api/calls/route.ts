import { NextRequest, NextResponse } from 'next/server';
import { db, takeUniqueOrThrow } from '@/lib/db/client';
import { callTable } from '@/lib/db/call.db';

// GET handler to retrieve call entities
export async function GET(request: NextRequest) {
  const calls = await db.select().from(callTable);
  return NextResponse.json(calls);
}

// POST handler to create a new call entity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    // Add your validation logic here based on your schema requirements

    // Insert the new call into the database
    const newCall = await db
      .insert(callTable)
      .values(body)
      .returning()
      .then(takeUniqueOrThrow);

    return NextResponse.json(newCall, { status: 201 });
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json(
      { error: 'Failed to create call' },
      { status: 500 }
    );
  }
}
