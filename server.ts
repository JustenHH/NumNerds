import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';

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
    process.env.OAUTH_STATE_SECRET?.trim() ||
    process.env.BLIZZARD_CLIENT_SECRET?.trim() ||
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

function isBlizzardConfigured(): boolean {
  return Boolean(
    process.env.BLIZZARD_CLIENT_ID?.trim() &&
      process.env.BLIZZARD_CLIENT_SECRET?.trim()
  );
}

function getAppBaseUrl(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`.replace(/\/+$/, '');
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

function signStatePayload(payload: { uid: string; region: BlizzardRegion; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecretKey())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyStatePayload(
  token: string
): { uid: string; region: BlizzardRegion; exp: number } | null {
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
  const clientId = process.env.BLIZZARD_CLIENT_ID!.trim();
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET!.trim();
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

async function fetchClassicCharacterDetails(
  region: BlizzardRegion,
  realmSlug: string,
  characterName: string,
  accessToken: string
): Promise<SyncedCharacterPayload | null> {
  const safeRealm = slugifyRealm(realmSlug);
  const safeChar = characterName.trim().toLowerCase();
  if (!safeRealm || !/^[a-z0-9-]+$/.test(safeRealm)) {
    return null;
  }
  if (!safeChar || safeChar.length < 2 || safeChar.length > 24 || /[/?#\\]/.test(safeChar)) {
    return null;
  }

  const namespace = `profile-classic1x-${region}`;
  const cleanRealm = encodeURIComponent(safeRealm);
  const cleanChar = encodeURIComponent(safeChar);
  const baseUrl = `https://${region}.api.blizzard.com/profile/wow/character/${cleanRealm}/${cleanChar}`;

  const profileResp = await fetch(
    `${baseUrl}?namespace=${encodeURIComponent(namespace)}&locale=en_US`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!profileResp.ok) {
    return null;
  }

  const profile = (await profileResp.json()) as {
    name?: string;
    level?: number;
    equipped_item_level?: number;
    average_item_level?: number;
    faction?: { name?: string };
    race?: { name?: string };
    character_class?: { name?: string };
    realm?: { name?: string; slug?: string };
    guild?: { name?: string };
  };

  const rawClass = profile.character_class?.name || 'Warrior';
  const wowClass = (VALID_CLASSES.has(rawClass) ? rawClass : 'Warrior') as SyncedCharacterPayload['wowClass'];
  const faction = profile.faction?.name === 'Horde' ? 'Horde' : 'Alliance';

  // Attempt Classic Era professions sub-endpoint (gracefully skip if Blizzard returns 404)
  const professions: SyncedProfession[] = [];
  try {
    const profResp = await fetch(
      `${baseUrl}/professions?namespace=${encodeURIComponent(namespace)}&locale=en_US`,
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
    // Classic Era often returns 404 on /professions; preserve manual professions client-side
  }

  return {
    name: profile.name || characterName,
    realm: profile.realm?.name || realmSlug,
    realmSlug: profile.realm?.slug || realmSlug,
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
    const state = signStatePayload({
      uid: firebaseUser.uid,
      region,
      exp: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: process.env.BLIZZARD_CLIENT_ID!.trim(),
      redirect_uri: getRedirectUri(req),
      response_type: 'code',
      scope: 'wow.profile',
      state,
    });

    const authUrl = `https://oauth.battle.net/authorize?${params.toString()}`;
    res.json({ url: authUrl, region });
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
      res.status(400).send(`
        <html><body style="background:#0b0e14;color:#f1f5f9;font-family:sans-serif;padding:24px;">
          <h3>Invalid or Expired OAuth State</h3>
          <p>Please close this window and try connecting again.</p>
        </body></html>
      `);
      return;
    }

    try {
      const clientId = process.env.BLIZZARD_CLIENT_ID!.trim();
      const clientSecret = process.env.BLIZZARD_CLIENT_SECRET!.trim();
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const tokenResp = await fetch('https://oauth.battle.net/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: getRedirectUri(req),
        }),
      });

      if (!tokenResp.ok) {
        throw new Error(`Token exchange failed (${tokenResp.status})`);
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
        </body></html>
      `);
    }
  };

  app.get(['/auth/blizzard/callback', '/auth/blizzard/callback/'], (req, res) => {
    void handleBlizzardCallback(req, res);
  });

  // 4. Sync all Classic Era characters from user's connected Battle.net account
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
    const namespace = `profile-classic1x-${region}`;

    try {
      const summaryResp = await fetch(
        `https://${region}.api.blizzard.com/profile/user/wow?namespace=${encodeURIComponent(namespace)}&locale=en_US`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );

      if (!summaryResp.ok) {
        res.status(summaryResp.status).json({
          error: `Blizzard returned HTTP ${summaryResp.status} for Classic Era (${region.toUpperCase()}). Make sure you selected the right region and have logged out of your character recently.`,
        });
        return;
      }

      const summary = (await summaryResp.json()) as {
        wow_accounts?: Array<{
          characters?: Array<{
            name?: string;
            level?: number;
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
        if (!c.name || !c.realm?.slug) continue;
        const detailed = await fetchClassicCharacterDetails(
          region,
          c.realm.slug,
          c.name,
          session.accessToken
        );

        if (detailed) {
          synced.push(detailed);
        } else {
          // Fallback to summary data if character is under level 10 or not yet indexed
          const rawClass = c.playable_class?.name || 'Warrior';
          const wowClass = (VALID_CLASSES.has(rawClass) ? rawClass : 'Warrior') as SyncedCharacterPayload['wowClass'];
          synced.push({
            name: c.name,
            realm: c.realm.name || c.realm.slug,
            realmSlug: c.realm.slug,
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
        battleTag: session.battleTag || null,
        characters: synced,
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

  // 6. Optional public character refresh via Client Credentials (for refreshing a single character by realm + name)
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

    const realmSlug = slugifyRealm(realmInput);
    if (!realmSlug || !nameInput || nameInput.length < 2 || nameInput.length > 24) {
      res.status(400).json({ error: 'Valid realm and character name are required.' });
      return;
    }

    try {
      const token = await getClientCredentialsToken();
      const details = await fetchClassicCharacterDetails(region, realmSlug, nameInput, token);
      if (!details) {
        res.status(404).json({
          error: `Character "${nameInput}" on "${realmSlug}" (${region.toUpperCase()}) was not found in Classic Era.`,
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
