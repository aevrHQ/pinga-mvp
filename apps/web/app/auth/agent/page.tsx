import { redirect } from 'next/navigation';

export default function AgentAuthPage({
  searchParams,
}: {
  searchParams: { client_id?: string; redirect_uri?: string; state?: string };
}) {
  const clientId = searchParams.client_id;
  const redirectUri = searchParams.redirect_uri;
  const state = searchParams.state;

  if (!clientId || !redirectUri || !state) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h1>❌ Invalid OAuth Request</h1>
        <p>Missing required parameters: client_id, redirect_uri, or state</p>
      </div>
    );
  }

  // Encode the CLI redirect_uri and state in the GitHub state parameter
  const cliState = {
    original_redirect_uri: redirectUri,
    original_state: state,
  };

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set(
    'client_id',
    process.env.GITHUB_CLIENT_ID || ''
  );
  githubAuthUrl.searchParams.set(
    'redirect_uri',
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/github/callback`
  );
  githubAuthUrl.searchParams.set('scope', 'repo workflow');
  githubAuthUrl.searchParams.set('state', JSON.stringify(cliState));

  // Server-side redirect
  redirect(githubAuthUrl.toString());
}
