import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { callId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callId = params.callId;
  const body = await request.json();

  try {
    const scraperUrl = `${process.env.SCRAPER_URL}/${callId}/scrape`;
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error calling scraper service:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with scraper service' },
      { status: 500 }
    );
  }
}
