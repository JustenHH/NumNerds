import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

type BlizzardRegion = 'eu' | 'us' | 'kr' | 'tw';

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

interface StoredBnetSession {
  accessToken: string;
  region: BlizzardRegion;
  expiresAt: number;
  battleTag?: string;
}

interface SyncedProfession {
  name: string;
  skill: number;
}

interface SyncedCharacterPayload {
  name: string;
  realm: string;
  realmSlug: string;
  faction: 'Alliance' | 'Horde';
  race: string;
  wowClass:
    | 'Warrior'
    | 'Paladin'
    | 'Hunter'
    | 'Rogue'
    | 'Priest'
    | 'Shaman'
    | 'Mage'
    | 'Warlock'
    | 'Druid';
  level: number;
  itemLevel: number;
  professions: SyncedProfession[];
  guildName: string;
}

const VALID_REGIONS = new Set<BlizzardRegion>(['eu', 'us', 'kr', 'tw']);
const VALID_CLASSES = new Set([
  'Warrior',
  'Paladin',
  'Hunter',
  'Rogue',
  'Priest',
  'Shaman',
  'Mage',
  'Warlock',
  'Druid',
]);

const PORT = Number(process.env.PORT || 3000);
const EPHEMERAL_FALLBACK_KEY = crypto.randomBytes(32).toString('hex');

function getSessionSecretKey(): Buffer {
  const raw =
    cleanEnv('OAUTH_STATE_SECRET') ||
    cleanEnv('BLIZZARD_CLIENT_SECRET') ||
    EPHEMERAL_FALLBACK_KEY;
  return crypto.createHash('sha256').update(raw).digest();
}

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8')) as {
  projectId: string;
};

// Server-side in-memory Battle.net token store + encrypted cookie persistence
const bnetTokensByUid = new Map<string, StoredBnetSession>();
let cachedClientToken: { token: string; expiresAt: number } | null = null;
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function sealBnetSession(payload: StoredBnetSession & { uid: string }): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getSessionSecretKey(), iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function unsealBnetSession(
  token: string,
  expectedUid: string
): StoredBnetSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [ivB64, tagB64, dataB64] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getSessionSecretKey(),
      Buffer.from(ivB64, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(decrypted) as StoredBnetSession & { uid?: string };
    if (
      !parsed.uid ||
      parsed.uid !== expectedUid ||
      !parsed.accessToken ||
      !VALID_REGIONS.has(parsed.region) ||
      Date.now() >= parsed.expiresAt
    ) {
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      region: parsed.region,
      expiresAt: parsed.expiresAt,
      battleTag: parsed.battleTag,
    };
  } catch {
    return null;
  }
}

function getBnetSession(req: Request, uid: string): StoredBnetSession | null {
  const mem = bnetTokensByUid.get(uid);
  if (mem && Date.now() < mem.expiresAt) {
    return mem;
  }
  if (mem) {
    bnetTokensByUid.delete(uid);
  }
  const cookies = parseCookies(req.headers.cookie);
  const sealed = cookies.bnet_session;
  if (!sealed) return null;
  const restored = unsealBnetSession(sealed, uid);
  if (restored) {
    bnetTokensByUid.set(uid, restored);
  }
  return restored;
}

function cleanEnv(name: string): string {
  return (process.env[name] || '').trim().replace(/^["']|["']$/g, '');
}

function isBlizzardConfigured(): boolean {
  return Boolean(cleanEnv('BLIZZARD_CLIENT_ID') && cleanEnv('BLIZZARD_CLIENT_SECRET'));
}

function firstHeaderValue(value: string | string[] | undefined): string {
  if (!value) return '';
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.split(',')[0].trim();
}

function sanitizeClientOrigin(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/\/+$/, '');
  if (/^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:run\.app|ai\.studio)$/i.test(trimmed)) {
    return trimmed;
  }
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

function getAppBaseUrl(req: Request): string {
  const clientOrigin = sanitizeClientOrigin(req.query.origin);
  if (clientOrigin) {
    return clientOrigin;
  }

  const protoRaw = firstHeaderValue(req.headers['x-forwarded-proto']) || req.protocol || 'https';
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || firstHeaderValue(req.get('host'));

  // Prefer the actual public request host (e.g., ais-dev, ais-pre, or *.ai.studio) when present
  // so OAuth cookies and callback origin always match the container the user is visiting.
  if (
    host &&
    !host.startsWith('localhost') &&
    !host.startsWith('127.0.0.1') &&
    !host.startsWith('0.0.0.0') &&
    !host.endsWith('.a.run.app') &&
    host.includes('.')
  ) {
    const proto =
      host.endsWith('.run.app') || host.endsWith('.ai.studio')
        ? 'https'
        : protoRaw === 'http' || protoRaw === 'https'
          ? protoRaw
          : 'https';
    return `${proto}://${host}`.replace(/\/+$/, '');
  }

  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }

  const fallbackProto = protoRaw === 'http' || protoRaw === 'https' ? protoRaw : 'https';
  return `${fallbackProto}://${host || `localhost:${PORT}`}`.replace(/\/+$/, '');
}

function getRedirectUri(req: Request): string {
  return `${getAppBaseUrl(req)}/auth/blizzard/callback`;
}

function sanitizeRegion(input: unknown): BlizzardRegion {
  const val = typeof input === 'string' ? input.toLowerCase().trim() : 'eu';
  if (VALID_REGIONS.has(val as BlizzardRegion)) {
    return val as BlizzardRegion;
  }
  return 'eu';
}

function slugifyRealm(realm: string): string {
  return realm
    .toLowerCase()
    .trim()
    .replace(/\s*\((eu|us|kr|tw)\)\s*$/i, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function signStatePayload(payload: {
  uid: string;
  region: BlizzardRegion;
  redirectUri: string;
  exp: number;
}): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecretKey())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyStatePayload(
  token: string
): { uid: string; region: BlizzardRegion; redirectUri?: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecretKey())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      uid: string;
      region: BlizzardRegion;
      redirectUri?: string;
      exp: number;
    };
    if (!parsed.uid || !VALID_REGIONS.has(parsed.region) || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedGoogleCerts && Date.now() < cachedGoogleCerts.expiresAt) {
    return cachedGoogleCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase verification certificates.');
  }
  const certs = (await resp.json()) as Record<string, string>;
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedGoogleCerts = {
    certs,
    expiresAt: Date.now() + maxAgeSec * 1000,
  };
  return certs;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  const segments = idToken.split('.');
  if (segments.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = segments;

  try {
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
    };

    if (header.alg !== 'RS256' || !header.kid) return null;
    if (payload.aud !== firebaseConfig.projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) return null;
    if (!payload.sub || typeof payload.sub !== 'string') return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSec) return null;
    if (!payload.email_verified) return null;

    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const valid = verifier.verify(cert, Buffer.from(signatureB64, 'base64url'));
    if (!valid) return null;

    return {
      uid: payload.sub,
      email: payload.email || '',
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}

async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired Firebase session.' });
    return;
  }
  (req as Request & { firebaseUser: VerifiedFirebaseUser }).firebaseUser = user;
  next();
}

async function getClientCredentialsToken(): Promise<string> {
  if (cachedClientToken && Date.now() < cachedClientToken.expiresAt - 60_000) {
    return cachedClientToken.token;
  }
  const clientId = cleanEnv('BLIZZARD_CLIENT_ID');
  const clientSecret = cleanEnv('BLIZZARD_CLIENT_SECRET');
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const resp = await fetch('https://oauth.battle.net/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!resp.ok) {
    throw new Error(`Blizzard client token request failed (${resp.status}).`);
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  cachedClientToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

function formatForeverFullName(
  firstName?: string,
  surname?: string,
  lastName?: string,
  fullName?: string
): string {
  if (fullName && fullName.trim()) {
    return fullName.trim().replace(/\s+/g, ' ');
  }
  const first = (firstName || '').trim();
  const last = (surname || lastName || '').trim();
  if (first && last && !first.toLowerCase().endsWith(` ${last.toLowerCase()}`)) {
    return `${first} ${last}`;
  }
  return first || last;
}

function extractSlugFromHref(href?: string): string | undefined {
  if (!href || typeof href !== 'string') return undefined;
  try {
    const url = new URL(href);
    const match = url.pathname.match(/\/profile\/wow\/character\/([^/?#]+)$/i);
    return match?.[1] ? decodeURIComponent(match[1]).toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

function formatNameFromSlug(slug?: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugifyForeverCharacter(name: string, providedSlug?: string): string {
  if (providedSlug && typeof providedSlug === 'string') {
    const clean = providedSlug.trim().toLowerCase();
    if (clean && !/[/?#\\]/.test(clean)) return clean;
  }
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

async function fetchForeverCharacterDetails(
  region: BlizzardRegion,
  characterName: string,
  accessToken: string,
  options?: { characterSlug?: string; realmSlug?: string }
): Promise<SyncedCharacterPayload | null> {
  const safeCharSlug = slugifyForeverCharacter(characterName, options?.characterSlug);
  if (!safeCharSlug || safeCharSlug.length < 2 || safeCharSlug.length > 64 || /[/?#\\]/.test(safeCharSlug)) {
    return null;
  }

  const namespace = `profile-forever-${region}`;
  const cleanChar = encodeURIComponent(safeCharSlug);
  const safeRealm = options?.realmSlug ? slugifyRealm(options.realmSlug) : '';

  // WoW: Forever uses realmless character endpoints (/profile/wow/character/{first-last});
  // keep /{realm}/{char} as a secondary fallback if realmSlug is present and realmless returns 404.
  const candidateBaseUrls = [
    `https://${region}.api.blizzard.com/profile/wow/character/${cleanChar}`,
  ];
  if (safeRealm && /^[a-z0-9-]+$/.test(safeRealm)) {
    candidateBaseUrls.push(
      `https://${region}.api.blizzard.com/profile/wow/character/${encodeURIComponent(safeRealm)}/${cleanChar}`
    );
  }

  interface BlizzardProfilePayload {
    name?: string;
    surname?: string;
    last_name?: string;
    full_name?: string;
    level?: number;
    equipped_item_level?: number;
    average_item_level?: number;
    faction?: { name?: string };
    race?: { name?: string };
    character_class?: { name?: string };
    realm?: { name?: string; slug?: string };
    guild?: { name?: string };
  }

  let matchedBaseUrl: string | null = null;
  let profile: BlizzardProfilePayload | null = null;

  for (const baseUrl of candidateBaseUrls) {
    try {
      const profileResp = await fetch(
        `${baseUrl}?namespace=${encodeURIComponent(namespace)}&locale=en_US`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (profileResp.ok) {
        profile = (await profileResp.json()) as BlizzardProfilePayload;
        matchedBaseUrl = baseUrl;
        break;
      }
    } catch {
      // try next candidate URL
    }
  }

  if (!profile || !matchedBaseUrl) {
    return null;
  }

  const rawClass = profile.character_class?.name || 'Warrior';
  const wowClass = (VALID_CLASSES.has(rawClass) ? rawClass : 'Warrior') as SyncedCharacterPayload['wowClass'];
  const faction = profile.faction?.name === 'Horde' ? 'Horde' : 'Alliance';

  // Attempt Forever professions sub-endpoint (gracefully skip if Blizzard returns 404)
  const professions: SyncedProfession[] = [];
  try {
    const profResp = await fetch(
      `${matchedBaseUrl}/professions?namespace=${encodeURIComponent(namespace)}&locale=en_US`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (profResp.ok) {
      const profJson = (await profResp.json()) as {
        primaries?: Array<{
          profession?: { name?: string };
          tiers?: Array<{ skill_points?: number; max_skill_points?: number }>;
        }>;
      };
      if (Array.isArray(profJson.primaries)) {
        for (const p of profJson.primaries.slice(0, 2)) {
          const pName = p.profession?.name;
          if (!pName) continue;
          const highestTier = p.tiers?.reduce(
            (max, t) => Math.max(max, t.skill_points || 0),
            0
          );
          professions.push({
            name: pName,
            skill: Math.min(300, Math.max(1, highestTier || 1)),
          });
        }
      }
    }
  } catch {
    // Sub-endpoint may return 404 on Forever; preserve manual professions client-side
  }

  const resolvedName =
    formatForeverFullName(
      profile.name,
      profile.surname,
      profile.last_name,
      profile.full_name
    ) || characterName;

  return {
    name: resolvedName,
    realm: profile.realm?.name || 'Forever',
    realmSlug: profile.realm?.slug || 'forever',
    faction,
    race: profile.race?.name || 'Human',
    wowClass,
    level: Math.min(60, Math.max(1, profile.level || 1)),
    itemLevel: Math.min(100, Math.max(0, profile.equipped_item_level ?? profile.average_item_level ?? 0)),
    professions,
    guildName: profile.guild?.name || '',
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  // 1. Configuration & connection status
  app.get('/api/blizzard/status', requireFirebaseAuth, (req: Request, res: Response) => {
    const { firebaseUser } = req as Request & { firebaseUser: VerifiedFirebaseUser };
    const session = getBnetSession(req, firebaseUser.uid);
    const active = Boolean(session && Date.now() < session.expiresAt);

    res.json({
      configured: isBlizzardConfigured(),
      connected: active,
      region: active ? session?.region : null,
      battleTag: active ? session?.battleTag || null : null,
      callbackUrl: getRedirectUri(req),
    });
  });

  // 2. Construct Battle.net OAuth URL for popup
  app.get('/api/blizzard/auth-url', requireFirebaseAuth, (req: Request, res: Response) => {
    if (!isBlizzardConfigured()) {
      res.status(503).json({
        error: 'Blizzard API credentials are not configured on the server.',
        callbackUrl: getRedirectUri(req),
      });
      return;
    }

    const { firebaseUser } = req as Request & { firebaseUser: VerifiedFirebaseUser };
    const region = sanitizeRegion(req.query.region);
    const redirectUri = getRedirectUri(req);
    const state = signStatePayload({
      uid: firebaseUser.uid,
      region,
      redirectUri,
      exp: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: cleanEnv('BLIZZARD_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'wow.profile',
      state,
    });

    const authUrl = `https://oauth.battle.net/authorize?${params.toString()}`;
    res.json({ url: authUrl, region, callbackUrl: redirectUri });
  });

  // 3. Battle.net OAuth Callback (handles trailing slash variations)
  const handleBlizzardCallback = async (req: Request, res: Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const stateRaw = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthError = typeof req.query.error === 'string' ? req.query.error : '';

    if (oauthError) {
      res.status(400).send(`
        <html><body style="background:#0b0e14;color:#f1f5f9;font-family:sans-serif;padding:24px;">
          <h3>Battle.net Authorization Cancelled</h3>
          <p>You can close this window and return to Numlock Nerds.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'BLIZZARD_AUTH_ERROR', error: ${JSON.stringify(oauthError)} }, '*');
              window.close();
            }
          </script>
        </body></html>
      `);
      return;
    }

    const state = verifyStatePayload(stateRaw);
    if (!code || !state || !isBlizzardConfigured()) {
      const reason = !isBlizzardConfigured()
        ? 'Blizzard credentials are not configured on the server.'
        : 'Invalid or expired OAuth state.';
      res.status(400).send(`
        <html><body style="background:#0b0e14;color:#f1f5f9;font-family:sans-serif;padding:24px;">
          <h3>Invalid or Expired OAuth State</h3>
          <p>Please close this window and try connecting again.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'BLIZZARD_AUTH_ERROR', error: ${JSON.stringify(reason)} }, '*');
              window.close();
            }
          </script>
        </body></html>
      `);
      return;
    }

    try {
      const clientId = cleanEnv('BLIZZARD_CLIENT_ID');
      const clientSecret = cleanEnv('BLIZZARD_CLIENT_SECRET');
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const redirectUri = state.redirectUri || getRedirectUri(req);

      const tokenResp = await fetch('https://oauth.battle.net/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResp.ok) {
        let detail = '';
        try {
          const errBody = (await tokenResp.json()) as { error_description?: string; error?: string };
          detail = errBody.error_description || errBody.error || '';
        } catch {
          // ignore non-JSON body
        }
        throw new Error(
          `Token exchange failed (${tokenResp.status})${detail ? `: ${detail}` : ''}`
        );
      }

      const tokenJson = (await tokenResp.json()) as {
        access_token: string;
        expires_in: number;
      };

      // Fetch BattleTag via /oauth/userinfo
      let battleTag: string | undefined;
      try {
        const userInfoResp = await fetch('https://oauth.battle.net/userinfo', {
          headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        });
        if (userInfoResp.ok) {
          const info = (await userInfoResp.json()) as { battletag?: string };
          battleTag = info.battletag;
        }
      } catch {
        // BattleTag lookup is optional
      }

      const sessionData: StoredBnetSession = {
        accessToken: tokenJson.access_token,
        region: state.region,
        expiresAt: Date.now() + tokenJson.expires_in * 1000,
        battleTag,
      };
      bnetTokensByUid.set(state.uid, sessionData);

      const sealedCookie = sealBnetSession({ ...sessionData, uid: state.uid });

      // Set Partitioned SameSite=None cookies so session survives server restarts in iframe context
      res.cookie('bnet_session', sealedCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        partitioned: true,
        maxAge: Math.min(tokenJson.expires_in, 86400) * 1000,
      });
      res.cookie('bnet_connected', '1', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        partitioned: true,
        maxAge: Math.min(tokenJson.expires_in, 86400) * 1000,
      });

      res.send(`
        <html>
          <body style="background:#0b0e14;color:#f1f5f9;font-family:sans-serif;padding:24px;">
            <p>Battle.net connected. Returning to Numlock Nerds...</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'BLIZZARD_AUTH_SUCCESS', region: ${JSON.stringify(state.region)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OAuth exchange failed.';
      res.status(500).send(`
        <html><body style="background:#0b0e14;color:#f1f5f9;font-family:sans-serif;padding:24px;">
          <h3>Battle.net Connection Failed</h3>
          <p>${msg.replace(/</g, '&lt;')}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'BLIZZARD_AUTH_ERROR', error: ${JSON.stringify(msg)} }, '*');
            }
          </script>
        </body></html>
      `);
    }
  };

  app.get(['/auth/blizzard/callback', '/auth/blizzard/callback/'], (req, res) => {
    void handleBlizzardCallback(req, res);
  });

  // 4. Sync all WoW: Forever characters from user's connected Battle.net account
  app.post('/api/blizzard/sync', requireFirebaseAuth, async (req: Request, res: Response) => {
    const { firebaseUser } = req as Request & { firebaseUser: VerifiedFirebaseUser };
    const session = getBnetSession(req, firebaseUser.uid);

    if (!session || Date.now() >= session.expiresAt) {
      bnetTokensByUid.delete(firebaseUser.uid);
      res.status(401).json({
        error: 'Battle.net session expired or not connected. Please reconnect Battle.net.',
      });
      return;
    }

    const region = sanitizeRegion(req.body?.region || session.region);
    const namespace = `profile-forever-${region}`;

    try {
      const summaryResp = await fetch(
        `https://${region}.api.blizzard.com/profile/user/wow?namespace=${encodeURIComponent(namespace)}&locale=en_US`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );

      if (summaryResp.status === 404) {
        res.json({
          region,
          namespace,
          battleTag: session.battleTag || null,
          characters: [],
          diagnostic: `Connected to Battle.net (${region.toUpperCase()}), but Blizzard returned 404 for namespace "${namespace}". Either you have no WoW: Forever characters indexed on ${region.toUpperCase()} yet (characters typically appear after reaching level 10 and logging out), or your Forever account is on another region (EU vs US).`,
        });
        return;
      }

      if (!summaryResp.ok) {
        let detail = '';
        try {
          const errText = await summaryResp.text();
          if (errText) {
            try {
              const parsed = JSON.parse(errText) as {
                detail?: string;
                error_description?: string;
                message?: string;
              };
              detail = parsed.detail || parsed.error_description || parsed.message || '';
            } catch {
              detail = errText.slice(0, 160);
            }
          }
        } catch {
          // ignore body read error
        }
        res.status(summaryResp.status).json({
          error: `Blizzard returned HTTP ${summaryResp.status} for WoW: Forever (${region.toUpperCase()})${detail ? `: ${detail}` : '.'} Check your selected region or reconnect Battle.net.`,
        });
        return;
      }

      const summary = (await summaryResp.json()) as {
        wow_accounts?: Array<{
          characters?: Array<{
            name?: string;
            surname?: string;
            last_name?: string;
            full_name?: string;
            slug?: string;
            level?: number;
            character?: {
              href?: string;
              name?: string;
              surname?: string;
              last_name?: string;
              slug?: string;
            };
            realm?: { name?: string; slug?: string };
            playable_class?: { name?: string };
            playable_race?: { name?: string };
            faction?: { name?: string };
          }>;
        }>;
      };

      const rawChars =
        summary.wow_accounts?.flatMap((acc) => acc.characters || []) || [];

      const synced: SyncedCharacterPayload[] = [];
      for (const c of rawChars.slice(0, 25)) {
        const hrefSlug = extractSlugFromHref(c.character?.href);
        const charSlug = c.slug || c.character?.slug || hrefSlug;
        const firstName = c.name || c.character?.name;
        const lastName = c.surname || c.last_name || c.character?.surname || c.character?.last_name;
        const combined = formatForeverFullName(firstName, lastName, undefined, c.full_name);
        const fullName =
          combined.includes(' ')
            ? combined
            : charSlug && charSlug.includes('-')
              ? formatNameFromSlug(charSlug)
              : combined;

        if (!fullName) continue;
        const detailed = await fetchForeverCharacterDetails(
          region,
          fullName,
          session.accessToken,
          {
            characterSlug: charSlug,
            realmSlug: c.realm?.slug,
          }
        );

        if (detailed) {
          synced.push({
            ...detailed,
            name: detailed.name.includes(' ') ? detailed.name : fullName,
          });
        } else {
          // Fallback to summary data if character is under level 10 or detailed endpoint returns 404
          const rawClass = c.playable_class?.name || 'Warrior';
          const wowClass = (VALID_CLASSES.has(rawClass) ? rawClass : 'Warrior') as SyncedCharacterPayload['wowClass'];
          synced.push({
            name: fullName,
            realm: c.realm?.name || 'Forever',
            realmSlug: c.realm?.slug || 'forever',
            faction: c.faction?.name === 'Horde' ? 'Horde' : 'Alliance',
            race: c.playable_race?.name || 'Human',
            wowClass,
            level: Math.min(60, Math.max(1, c.level || 1)),
            itemLevel: 0,
            professions: [],
            guildName: '',
          });
        }
      }

      res.json({
        region,
        namespace,
        battleTag: session.battleTag || null,
        characters: synced,
        diagnostic:
          synced.length === 0
            ? `Connected to Battle.net (${region.toUpperCase()}), and Blizzard returned 0 WoW: Forever characters. In WoW: Forever, characters usually do not populate in Blizzard's API until they reach level 10 and you log out of the game at least once (or switch between EU / US region).`
            : undefined,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to sync from Blizzard API.',
      });
    }
  });

  // 5. Disconnect Battle.net session
  app.post('/api/blizzard/disconnect', requireFirebaseAuth, (req: Request, res: Response) => {
    const { firebaseUser } = req as Request & { firebaseUser: VerifiedFirebaseUser };
    bnetTokensByUid.delete(firebaseUser.uid);
    res.clearCookie('bnet_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
    });
    res.clearCookie('bnet_connected', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      partitioned: true,
    });
    res.json({ disconnected: true });
  });

  // 6. Optional public character refresh via Client Credentials (realmless Forever slug)
  app.post('/api/blizzard/lookup', requireFirebaseAuth, async (req: Request, res: Response) => {
    if (!isBlizzardConfigured()) {
      res.status(503).json({
        error: 'Blizzard API credentials are not configured on the server.',
      });
      return;
    }

    const region = sanitizeRegion(req.body?.region);
    const realmInput = typeof req.body?.realm === 'string' ? req.body.realm : '';
    const nameInput = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

    if (!nameInput || nameInput.length < 2 || nameInput.length > 48) {
      res.status(400).json({ error: 'Valid character name is required.' });
      return;
    }

    try {
      const token = await getClientCredentialsToken();
      const details = await fetchForeverCharacterDetails(region, nameInput, token, {
        realmSlug: realmInput || undefined,
      });
      if (!details) {
        res.status(404).json({
          error: `Character "${nameInput}" (${region.toUpperCase()}) was not found in WoW: Forever.`,
        });
        return;
      }
      res.json({ character: details });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to look up character on Blizzard API.',
      });
    }
  });

  // Mount Vite middleware in dev or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Numlock Nerds server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
