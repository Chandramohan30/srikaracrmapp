/**
 * Client for the local OpenWA (wa-automate) REST server, e.g.
 *   npx --no-install wa-automate --session-id srikara --host 127.0.0.1 --port 8080
 *
 * Route names differ between OpenWA versions, so the send route + body shape are DISCOVERED from the
 * server's own OpenAPI file (/meta/swagger.json) the first time we send. Override anything with .env:
 *   OPENWA_URL, OPENWA_API_KEY, OPENWA_SESSION_ID, OPENWA_SEND_PATH, OPENWA_SWAGGER_PATH
 */
const baseUrl = () => (process.env.OPENWA_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const sessionId = () => process.env.OPENWA_SESSION_ID || 'srikara';

/** 9876543210 / +91 98765-43210 / 09876543210  ->  919876543210@c.us */
export function toChatId(phone: string): string | null {
  let digits = String(phone || '').replace(/\D/g, '');
  const cc = (process.env.DEFAULT_COUNTRY_CODE || '91').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = cc + digits;
  if (digits.length < 11 || digits.length > 15) return null;
  return `${digits}@c.us`;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OPENWA_API_KEY) {
    h['X-API-Key'] = process.env.OPENWA_API_KEY; // OpenWA 5.x
    h['key'] = process.env.OPENWA_API_KEY;       // older versions
  }
  return h;
}

async function timedFetch(url: string, init: RequestInit = {}, ms = 20_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------------------
// Discover the "send text" route from swagger.json
// ---------------------------------------------------------------------------
interface SendSpec {
  path: string;                                   // with {params} already filled
  source: 'env' | 'swagger' | 'fallback';
  build: (to: string, text: string) => any;       // request body
}

let cachedSpec: SendSpec | null = null;
let discoveredPaths: string[] = [];

const TO_KEYS = ['to', 'chatId', 'chat_id', 'number', 'phone', 'jid', 'recipient'];
const TEXT_KEYS = ['content', 'text', 'message', 'body'];

function deref(node: any, doc: any, depth = 0): any {
  if (!node || depth > 6) return node;
  if (node.$ref && typeof node.$ref === 'string') {
    const parts = node.$ref.replace(/^#\//, '').split('/');
    let cur: any = doc;
    for (const p of parts) cur = cur?.[p];
    return deref(cur, doc, depth + 1);
  }
  return node;
}

function bodyBuilderFrom(schema: any, doc: any): (to: string, text: string) => any {
  const props = deref(schema, doc)?.properties || {};
  const wrap = props.args ? deref(props.args, doc)?.properties || {} : null;
  const fields = wrap ?? props;
  const toKey = TO_KEYS.find(k => k in fields) || 'to';
  const textKey = TEXT_KEYS.find(k => k in fields) || 'content';
  return (to, text) => (wrap || !Object.keys(fields).length
    ? { args: { [toKey]: to, [textKey]: text } }
    : { [toKey]: to, [textKey]: text });
}

async function resolveSendSpec(force = false): Promise<SendSpec> {
  if (cachedSpec && !force) return cachedSpec;

  const fill = (p: string) => p.replace(/\{(sessionId|session|session_id|id)\}/gi, encodeURIComponent(sessionId()));

  let doc: any = null;
  try {
    const res = await timedFetch(`${baseUrl()}${process.env.OPENWA_SWAGGER_PATH || '/meta/swagger.json'}`, { headers: headers() }, 8_000);
    if (res.ok) doc = await res.json();
  } catch { /* handled below */ }

  const paths: Record<string, any> = doc?.paths || {};
  discoveredPaths = Object.keys(paths);

  // 1) explicit override
  if (process.env.OPENWA_SEND_PATH) {
    const p = process.env.OPENWA_SEND_PATH;
    const op = paths[p]?.post;
    const schema = op?.requestBody?.content?.['application/json']?.schema;
    cachedSpec = { path: fill(p), source: 'env', build: schema ? bodyBuilderFrom(schema, doc) : (to, text) => ({ args: { to, content: text } }) };
    return cachedSpec;
  }

  // 2) discovered: POST route that looks like "send text"
  const score = (p: string) => {
    const l = p.toLowerCase();
    if (/sendtext$|send-text$|send_text$/.test(l)) return 3;
    if (/send.?text/.test(l)) return 2;
    if (/messages?\/send|send.?message/.test(l)) return 1;
    return 0;
  };
  const found = discoveredPaths.filter(p => paths[p]?.post && score(p) > 0).sort((a, b) => score(b) - score(a))[0];
  if (found) {
    const schema = paths[found].post?.requestBody?.content?.['application/json']?.schema;
    cachedSpec = { path: fill(found), source: 'swagger', build: schema ? bodyBuilderFrom(schema, doc) : (to, text) => ({ args: { to, content: text } }) };
    console.log(`[WhatsApp] Using send route discovered from swagger: POST ${cachedSpec.path}`);
    return cachedSpec;
  }

  // 3) last resort: old Easy API style
  return { path: '/sendText', source: 'fallback', build: (to, text) => ({ args: { to, content: text } }) };
}

export interface SendResult { ok: boolean; error?: string; response?: any }

export async function sendWhatsApp(phone: string, text: string): Promise<SendResult> {
  const to = toChatId(phone);
  if (!to) return { ok: false, error: `Invalid phone number "${phone}"` };
  if (!text?.trim()) return { ok: false, error: 'Empty message' };

  try {
    let spec = await resolveSendSpec();
    let res = await timedFetch(`${baseUrl()}${spec.path}`, { method: 'POST', headers: headers(), body: JSON.stringify(spec.build(to, text)) });
    if (res.status === 404 && spec.source !== 'swagger') {   // route moved -> rediscover once
      spec = await resolveSendSpec(true);
      res = await timedFetch(`${baseUrl()}${spec.path}`, { method: 'POST', headers: headers(), body: JSON.stringify(spec.build(to, text)) });
    }
    const raw = await res.text();
    let body: any = raw;
    try { body = JSON.parse(raw); } catch { /* keep text */ }
    const failed = !res.ok || (body && typeof body === 'object' && (body.success === false || body.ok === false));
    if (failed) {
      const msg = body && typeof body === 'object' ? (body.error?.message || body.error || body.message || JSON.stringify(body)) : raw;
      const hint = res.status === 404
        ? ` | tried POST ${spec.path} (${spec.source}). Routes with "send": ${discoveredPaths.filter(p => /send/i.test(p)).slice(0, 8).join(', ') || 'none found - could not read /meta/swagger.json'}`
        : res.status === 401 || res.status === 403 ? ' | check OPENWA_API_KEY in .env' : '';
      return { ok: false, error: `OpenWA ${res.status}: ${String(msg).slice(0, 300)}${hint}` };
    }
    return { ok: true, response: body };
  } catch (e: any) {
    const reason = e?.name === 'AbortError' ? 'timed out' : (e?.cause?.code || e?.message || 'unreachable');
    return { ok: false, error: `OpenWA server not reachable (${reason}). Is it running on ${baseUrl()}?` };
  }
}

export async function whatsappStatus() {
  try {
    const res = await timedFetch(`${baseUrl()}/health`, { headers: headers() }, 5_000);
    const raw = await res.text();
    let detail: any = raw;
    try { detail = JSON.parse(raw); } catch { /* text */ }
    const spec = await resolveSendSpec().catch(() => null);
    return { reachable: res.ok, detail, send_route: spec ? { method: 'POST', path: spec.path, source: spec.source } : null,
      routes_with_send: discoveredPaths.filter(p => /send/i.test(p)).slice(0, 15) };
  } catch (e: any) {
    return { reachable: false, error: e?.message || 'unreachable' };
  }
}
