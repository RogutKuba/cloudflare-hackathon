import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Extract required fields from the request body
    const { script, phoneNumber } = body;

    if (!phoneNumber || !script) {
      return NextResponse.json(
        { error: 'Phone number and script are required' },
        { status: 400 }
      );
    }

    console.log('script', script);
    console.log('phoneNumber', phoneNumber);

    // Make the request to the external API
    const response = await fetch(
      'https://cloudflare-hackathon-production.up.railway.app/make-call',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: `+1${phoneNumber}`,
          instructions: script,
          // Optional fields with defaults
          first_message: 'Hello',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Failed to start call', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('data', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error starting call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add CORS headers to handle cross-origin requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
