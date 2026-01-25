// CLI Agent OAuth Callback Handler
// Handles the response from GitHub OAuth and exchanges the code for an access token

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { code, client_id, redirect_uri } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      );
    }

    // Exchange GitHub code for access token
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/github/callback`,
        }),
      }
    );

    const data = await tokenResponse.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error_description },
        { status: 401 }
      );
    }

    const accessToken = data.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get access token' },
        { status: 401 }
      );
    }

    // Generate a unique agent ID
    const agentId = `agent-${randomUUID()}`;

    // Return token to CLI agent
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      agent_id: agentId,
    });
  } catch (error) {
    console.error('[Auth Callback] Error:', error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
