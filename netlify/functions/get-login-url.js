export async function handler(event, context) {
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const REDIRECT_URI = 'https://catifybeta.netlify.app/callback.html';
  const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

  const SCOPES = [
    'playlist-modify-private',
    'playlist-modify-public',
    'user-read-private',
    'user-read-email'
  ];

  const scopeParam = SCOPES.join(' ');
  const url = `${SPOTIFY_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&scope=${encodeURIComponent(scopeParam)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  return {
    statusCode: 200,
    body: JSON.stringify({ url })
  };
}
