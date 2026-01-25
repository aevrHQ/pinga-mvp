// GitHub OAuth Callback Handler
// Handles redirect from GitHub and exchanges code for token

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code received' },
        { status: 400 }
      );
    }

    // Parse the state to check if this is a CLI or web auth
    let cliState = null;
    try {
      if (state) {
        cliState = JSON.parse(state);
      }
    } catch (e) {
      // Not valid JSON, might be plain state
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
    const accessToken = data.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: data.error_description || 'Failed to get access token' },
        { status: 401 }
      );
    }

    // If this is a CLI agent auth, redirect to the CLI's redirect_uri with the code
    if (cliState?.original_redirect_uri) {
      const redirectUrl = new URL(cliState.original_redirect_uri);
      redirectUrl.searchParams.set('code', code);
      redirectUrl.searchParams.set('state', cliState.original_state || '');
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Otherwise, this is a web auth - store token and redirect to dashboard
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`
    );

    // Store token in secure HTTP-only cookie
    response.cookies.set({
      name: 'github_token',
      value: accessToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[GitHub Callback] Error:', error);
    return NextResponse.json(
      {
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
