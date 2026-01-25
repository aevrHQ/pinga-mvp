'use client';

import { useEffect } from 'react';

export default function AgentAuthPage({
  searchParams,
}: {
  searchParams: { client_id?: string; redirect_uri?: string; state?: string };
}) {
  useEffect(() => {
    const initiateGitHubAuth = () => {
      const clientId = searchParams.client_id;
      const redirectUri = searchParams.redirect_uri;
      const state = searchParams.state;

      if (!clientId || !redirectUri || !state) {
        console.error('Missing required OAuth parameters');
        return;
      }

      // Encode the CLI redirect_uri and state in the GitHub state parameter
      const cliState = {
        original_redirect_uri: redirectUri,
        original_state: state,
      };

      const githubAuthUrl = new URL(
        'https://github.com/login/oauth/authorize'
      );
      githubAuthUrl.searchParams.set(
        'client_id',
        process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || ''
      );
      githubAuthUrl.searchParams.set(
        'redirect_uri',
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/github/callback`
      );
      githubAuthUrl.searchParams.set('scope', 'repo workflow');
      githubAuthUrl.searchParams.set('state', JSON.stringify(cliState));

      // Redirect to GitHub
      window.location.href = githubAuthUrl.toString();
    };

    initiateGitHubAuth();
  }, [searchParams]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1>🔐 DevFlow Agent Authentication</h1>
        <p>Redirecting to GitHub...</p>
        <p style={{ fontSize: '0.9em', opacity: 0.7 }}>
          You will be asked to authorize DevFlow to access your repositories.
        </p>
      </div>
    </div>
  );
}
