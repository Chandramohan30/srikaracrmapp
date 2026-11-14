import crypto from 'crypto';

// ---------- Password hashing (scrypt, no extra dependency) ----------
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived: Buffer = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored?: string): Promise<boolean> {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const derived: Buffer = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)));
  });
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

// ---------- Signed tokens (HMAC-SHA256) ----------
// access  : short lived (3 min), sent as "Authorization: Bearer <token>"
// refresh : long lived (7 days), rotated on every use, stored HASHED in MongoDB
// receipt : link token used in WhatsApp / e-mail messages to download one receipt
export const ACCESS_TTL_MS = 3 * 60 * 1000; // access token: 3 minutes (refresh token renews it silently)
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RECEIPT_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type TokenType = 'access' | 'refresh' | 'receipt';

function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    crypto.createHash('sha256').update(`srikara-crm:${process.env.MONGODB_URI || 'local'}`).digest('hex')
  );
}

const b64 = (input: string | Buffer) => Buffer.from(input).toString('base64url');

// Standard JWT (HS256): base64url(header).base64url(payload).base64url(HMAC-SHA256)
// Claims: sub/uid, typ, iat & exp (seconds, per RFC 7519). Signed with AUTH_SECRET.
const JWT_HEADER = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

const hmac = (data: string) => crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sign(typ: TokenType, claims: Record<string, any>, ttlMs: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64(JSON.stringify({
    ...claims,
    sub: claims.uid ?? claims.pid,
    typ,
    iat: now,
    exp: now + Math.floor(ttlMs / 1000)
  }));
  const data = `${JWT_HEADER}.${payload}`;
  return `${data}.${hmac(data)}`;
}

function verify(token: string, typ: TokenType): Record<string, any> | null {
  try {
    const parts = String(token).split('.');
    let data: any;

    if (parts.length === 3) {
      // JWT
      const [header, payload, sig] = parts;
      const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
      if (h.alg !== 'HS256') return null; // never accept "none" or other algs
      if (!safeEqual(sig, hmac(`${header}.${payload}`))) return null;
      data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (!data.exp || data.exp * 1000 < Date.now()) return null;
    } else if (parts.length === 2) {
      // Legacy "payload.sig" token (exp in ms) - kept so receipt links already sent still open
      const [payload, sig] = parts;
      if (!safeEqual(sig, hmac(payload))) return null;
      data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (!data.exp || data.exp < Date.now()) return null;
    } else {
      return null;
    }

    if (data.typ !== typ) return null;
    return data;
  } catch {
    return null;
  }
}

export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export function signAccessToken(userId: string): string {
  return sign('access', { uid: userId }, ACCESS_TTL_MS);
}

export function verifyAccessToken(token: string): { uid: string } | null {
  const d = verify(token, 'access');
  return d?.uid ? { uid: d.uid } : null;
}

/** jti identifies one refresh token in the DB so it can be rotated / revoked */
export function signRefreshToken(userId: string, jti: string): string {
  return sign('refresh', { uid: userId, jti }, REFRESH_TTL_MS);
}

export function verifyRefreshToken(token: string): { uid: string; jti: string } | null {
  const d = verify(token, 'refresh');
  return d?.uid && d?.jti ? { uid: d.uid, jti: d.jti } : null;
}

export function signReceiptLinkToken(paymentId: string): string {
  return sign('receipt', { pid: paymentId }, RECEIPT_LINK_TTL_MS);
}

export function verifyReceiptLinkToken(token: string): { pid: string } | null {
  const d = verify(token, 'receipt');
  return d?.pid ? { pid: d.pid } : null;
}
