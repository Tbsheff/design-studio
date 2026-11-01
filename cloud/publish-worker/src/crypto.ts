import { ApiError } from "./http";

const enc = new TextEncoder();

export function toHex(buffer: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

export function sameBytes(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.byteLength !== y.byteLength) {
    crypto.subtle.timingSafeEqual(x, x);
    return false;
  }
  return crypto.subtle.timingSafeEqual(x, y);
}

export async function checkKey(
  request: Request,
  keyHash: string
): Promise<void> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(header);
  if (!keyHash || !/^[0-9a-f]{64}$/.test(keyHash))
    throw new ApiError(
      503,
      "not_set_up",
      "The publish key is not set on this Worker. Run Set up publishing again."
    );
  if (!match?.[1])
    throw new ApiError(401, "no_key", "This request needs the publish key.");
  if (!sameBytes(await sha256Hex(match[1]), keyHash))
    throw new ApiError(401, "bad_key", "The publish key is wrong.");
}

export function randomId(bytes = 9): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface PasswordHash {
  iter: number;
  salt: string;
  hash: string;
}

export function parsePasswordHash(text: string | null): PasswordHash | null {
  const match =
    /^pbkdf2-sha256\$(\d{4,7})\$([0-9a-f]{32})\$([0-9a-f]{64})$/.exec(
      text ?? ""
    );
  if (!match) return null;
  return {
    iter: Number(match[1]),
    salt: match[2] as string,
    hash: match[3] as string,
  };
}

export async function passwordMatches(
  password: string,
  stored: PasswordHash
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromHex(stored.salt),
      iterations: stored.iter,
    },
    key,
    256
  );
  return sameBytes(toHex(bits), stored.hash);
}

async function hmacKey(keyHash: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`design-studio-publish/cookie/${keyHash}`)
  );
  return crypto.subtle.importKey(
    "raw",
    material,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function mac(keyHash: string, text: string): Promise<string> {
  return toHex(
    await crypto.subtle.sign("HMAC", await hmacKey(keyHash), enc.encode(text))
  );
}

export const COOKIE_TTL_S = 12 * 60 * 60;

export async function makePass(
  keyHash: string,
  publicationId: string,
  salt: string,
  now = Date.now()
): Promise<string> {
  const until = Math.floor(now / 1000) + COOKIE_TTL_S;
  return `${until}.${await mac(keyHash, `${publicationId}|${salt}|${until}`)}`;
}

export async function passValid(
  keyHash: string,
  publicationId: string,
  salt: string,
  value: string | null,
  now = Date.now()
): Promise<boolean> {
  const match = /^(\d{9,11})\.([0-9a-f]{64})$/.exec(value ?? "");
  if (!match) return false;
  const until = Number(match[1]);
  if (until * 1000 < now) return false;
  return sameBytes(
    await mac(keyHash, `${publicationId}|${salt}|${until}`),
    match[2] as string
  );
}

export function cookieValue(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
