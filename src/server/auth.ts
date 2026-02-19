import { Router, Request, Response } from 'express';
import * as https from 'https';
import * as querystring from 'querystring';

const router = Router();

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

router.get('/login', (_req: Request, res: Response) => {
  const params = querystring.stringify({
    response_type: 'code',
    client_id: process.env.SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });
  res.redirect(`${SPOTIFY_AUTH_URL}?${params}`);
});

router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const tokens = await exchangeCode(code);
    (req.session as Record<string, unknown>).access_token = tokens.access_token;
    (req.session as Record<string, unknown>).refresh_token = tokens.refresh_token;
    (req.session as Record<string, unknown>).expires_at =
      Date.now() + tokens.expires_in * 1000;
    res.redirect('/');
  } catch (err) {
    console.error('Token exchange failed:', err);
    res.status(500).send('Authentication failed');
  }
});

router.get('/token', (req: Request, res: Response) => {
  const session = req.session as Record<string, unknown>;
  const accessToken = session.access_token;
  if (!accessToken) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ access_token: accessToken });
});

router.get('/refresh', async (req: Request, res: Response) => {
  const session = req.session as Record<string, unknown>;
  const refreshToken = session.refresh_token as string | undefined;
  if (!refreshToken) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const tokens = await refreshAccessToken(refreshToken);
    session.access_token = tokens.access_token;
    session.expires_at = Date.now() + tokens.expires_in * 1000;
    if (tokens.refresh_token) {
      session.refresh_token = tokens.refresh_token;
    }
    res.json({ access_token: tokens.access_token });
  } catch (err) {
    console.error('Token refresh failed:', err);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

function exchangeCode(code: string): Promise<TokenResponse> {
  const body = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });
  return spotifyTokenRequest(body);
}

function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = querystring.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return spotifyTokenRequest(body);
}

function spotifyTokenRequest(body: string): Promise<TokenResponse> {
  return new Promise((resolve, reject) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID ?? '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? '';
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const options = {
      hostname: 'accounts.spotify.com',
      path: '/api/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Basic ${credentials}`,
      },
    };

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => (data += chunk));
      resp.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error_description ?? json.error));
          } else {
            resolve(json as TokenResponse);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export { router as authRouter };
