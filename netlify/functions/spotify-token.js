export async function handler(event, context) {
  const client_id = process.env.SPOTIFY_CLIENT_ID;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect_uri = 'https://catifybeta.netlify.app/callback.html';

  const code = event.queryStringParameters.code;
  if (!code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing Spotify code' })
    };
  }

  const authBuffer = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authBuffer}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      })
    });

    const data = await res.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Token exchange failed' })
    };
  }
}
