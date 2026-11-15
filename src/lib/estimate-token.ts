// Server only. A sealed token that ties "Email My Updated Estimate" to one saved project request.
// The token is encrypted and signed (AES-256-GCM), so the browser can neither read nor change it: the email address
// inside it is the one the request was saved with, and updates can only ever go there. It lives in the visitor's
// browser storage, never in a URL or analytics.
// Key: ESTIMATE_TOKEN_SECRET if set, otherwise a key derived from SUPABASE_SERVICE_ROLE_KEY (never the key itself).
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

export type EstimateClaims = {
  /** Random reference for the saved request (also the ad conversion's transaction id). */
  ref: string;
  /** Where updated estimates may go: the address the request was saved with. */
  email: string;
  firstName: string;
  /** Expiry, milliseconds since 1970. */
  exp: number;
};

type Env = Record<string, string | undefined>;

/** How long "Email My Updated Estimate" keeps working after the request is saved. */
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PREFIX = "v1.";

function tokenKey(env: Env): Buffer | null {
  const secret = env.ESTIMATE_TOKEN_SECRET?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update("roofingnearmestl estimate token v1").digest();
}

export function sealEstimateToken(claims: EstimateClaims, env: Env): string | null {
  const key = tokenKey(env);
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(claims), "utf8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

/** The claims, or null for anything forged, changed, expired or malformed. Never throws. */
export function openEstimateToken(token: unknown, env: Env, now = Date.now()): EstimateClaims | null {
  try {
    if (typeof token !== "string" || !token.startsWith(PREFIX) || token.length > 2000) return null;
    const key = tokenKey(env);
    if (!key) return null;
    const raw = Buffer.from(token.slice(PREFIX.length), "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const claims = JSON.parse(json) as Partial<EstimateClaims>;
    if (typeof claims.ref !== "string" || typeof claims.email !== "string" || typeof claims.firstName !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp < now) return null;
    return { ref: claims.ref, email: claims.email, firstName: claims.firstName, exp: claims.exp };
  } catch {
    return null;
  }
}

export type SendCheck = "ok" | "duplicate" | "too_soon" | "limit";

/**
 * Updated-estimate email limits for one request: the same estimate is never emailed twice, at least a minute between
 * emails, and at most 5 updates. Kept in this server's memory; Resend's idempotency key (same request + same inputs)
 * also stops a repeat that reaches another server copy.
 */
export function createSendLimiter({ minGapMs = 60_000, maxSends = 5, maxTracked = 5000 } = {}) {
  const sent = new Map<string, { times: number[]; keys: Set<string> }>();
  return {
    check(ref: string, inputsKey: string, now = Date.now()): SendCheck {
      const entry = sent.get(ref);
      if (!entry) return "ok";
      if (entry.keys.has(inputsKey)) return "duplicate";
      if (entry.times.length >= maxSends) return "limit";
      if (now - entry.times[entry.times.length - 1] < minGapMs) return "too_soon";
      return "ok";
    },
    record(ref: string, inputsKey: string, now = Date.now()) {
      if (!sent.has(ref) && sent.size >= maxTracked) sent.delete(sent.keys().next().value as string);
      const entry = sent.get(ref) ?? { times: [], keys: new Set<string>() };
      entry.times.push(now);
      entry.keys.add(inputsKey);
      sent.set(ref, entry);
    },
  };
}
