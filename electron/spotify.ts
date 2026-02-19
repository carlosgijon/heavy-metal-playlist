import { BrowserWindow } from 'electron';
import * as http from 'http';
import * as crypto from 'crypto';

const REDIRECT_PORT = 3477;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;
const SCOPES = 'user-read-private';

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiry: number; // Unix ms timestamp
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// ── Token exchange ────────────────────────────────────────────────────────────

async function exchangeCode(
  clientId: string,
  code: string,
  verifier: string,
): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token exchange failed: ${err}`);
  }
  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiry: Date.now() + data.expires_in * 1000,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Opens a Spotify login window and performs the PKCE OAuth flow.
 * Returns the tokens when authentication completes.
 * The user must have configured http://localhost:3477/callback as a Redirect URI
 * in their Spotify Developer app.
 */
export function spotifyAuth(clientId: string): Promise<SpotifyTokens> {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  return new Promise((resolve, reject) => {
    let authWindow: BrowserWindow | null = null;
    let settled = false;

    const finish = (err: Error | null, tokens?: SpotifyTokens) => {
      if (settled) return;
      settled = true;
      server.close();
      authWindow?.destroy();
      authWindow = null;
      if (err) reject(err);
      else resolve(tokens!);
    };

    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url ?? '/', `http://localhost:${REDIRECT_PORT}`);
        if (reqUrl.pathname !== '/callback') {
          res.writeHead(404).end();
          return;
        }

        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        const html = error
          ? `<html><body style="font-family:sans-serif;padding:2rem"><h3>❌ Error: ${error}</h3><p>Puedes cerrar esta ventana.</p></body></html>`
          : `<html><body style="font-family:sans-serif;padding:2rem"><h3>✅ Autenticación completada</h3><p>Puedes cerrar esta ventana.</p></body></html>`;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);

        if (error || !code) {
          finish(new Error(error ?? 'No authorization code received'));
          return;
        }

        const tokens = await exchangeCode(clientId, code, verifier);
        finish(null, tokens);
      } catch (err) {
        finish(err instanceof Error ? err : new Error(String(err)));
      }
    });

    server.on('error', (err) => finish(err));

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      const authUrl =
        'https://accounts.spotify.com/authorize?' +
        new URLSearchParams({
          client_id: clientId,
          response_type: 'code',
          redirect_uri: REDIRECT_URI,
          scope: SCOPES,
          code_challenge_method: 'S256',
          code_challenge: challenge,
        }).toString();

      authWindow = new BrowserWindow({
        width: 480,
        height: 700,
        title: 'Conectar con Spotify',
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      authWindow.loadURL(authUrl);

      authWindow.on('closed', () => {
        authWindow = null;
        if (!settled) finish(new Error('Ventana cerrada por el usuario'));
      });
    });
  });
}

/**
 * Refreshes an expired Spotify access token using the stored refresh token.
 */
export async function refreshSpotifyToken(
  clientId: string,
  refreshToken: string,
): Promise<SpotifyTokens> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify token refresh failed: ${err}`);
  }
  const data = await res.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiry: Date.now() + data.expires_in * 1000,
  };
}

/**
 * Searches Spotify for a track and returns its BPM (tempo), or null if not found.
 */
export async function getSpotifyBpm(
  accessToken: string,
  title: string,
  artist: string,
): Promise<number | null> {
  // Search for the track
  const q = encodeURIComponent(`track:${title} artist:${artist}`);
  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json() as { tracks: { items: Array<{ id: string }> } };
  const trackId = searchData.tracks?.items?.[0]?.id;
  if (!trackId) return null;

  // Get audio features
  const featRes = await fetch(
    `https://api.spotify.com/v1/audio-features/${trackId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!featRes.ok) return null;

  const feat = await featRes.json() as { tempo?: number };
  return feat.tempo ? Math.round(feat.tempo) : null;
}
