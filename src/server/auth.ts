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
// access  : short lived (15 min), sent as "Authorization: Bearer <token>"
// refresh : long lived (7 days), rotated on every use, stored HASHED in MongoDB
// receipt : link token used in WhatsApp / e-mail messages to download one receipt
export const ACCESS_TTL_MS = 15 * 60 * 1000;
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

function sign(typ: TokenType, claims: Record<string, any>, ttlMs: number): string {
  const payload = b64(JSON.stringify({ ...claims, typ, exp: Date.now() + ttlMs }));
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verify(token: string, typ: TokenType): Record<string, any> | null {
  try {
    const [payload, sig] = String(token).split('.');
    if (!payload || !sig) return null;
    const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.typ !== typ || !data.exp || data.exp < Date.now()) return null;
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
