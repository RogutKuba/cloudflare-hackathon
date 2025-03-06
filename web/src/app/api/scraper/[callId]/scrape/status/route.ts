import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  const callId = (await params).callId;

  try {
    const scraperUrl = `${process.env.SCRAPER_URL}/${callId}/scrape/status`;
    const response = await fetch(scraperUrl);

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching scraper status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraper status' },
      { status: 500 }
    );
  }
}
