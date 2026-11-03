const PASS_SECONDS = 86_400;

const MS_PER_SECOND = 1000;

const HEX_RADIX = 16;

const HEX_WIDTH = 2;

const encoder = new TextEncoder();

interface PassClaim {
  readonly orgId: string;
  readonly publicationId: string;
  readonly salt: string;
  readonly slug: string;
}

const toCookieName = (slug: string): string => `pub_pass_${slug}`;

const toPayload = (claim: PassClaim, until: number): string =>
  [claim.orgId, claim.slug, claim.publicationId, claim.salt, until].join("|");

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(HEX_WIDTH, "0"))
    .join("");

const importKey = async (secret: string): Promise<CryptoKey> =>
  await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );

const toMac = async (
  secret: string,
  claim: PassClaim,
  until: number
): Promise<string> => {
  const key = await importKey(secret);

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(toPayload(claim, until))
  );

  return toHex(signed);
};

const isSameText = (left: string, right: string): boolean => {
  const first = encoder.encode(left);
  const second = encoder.encode(right);

  if (first.length !== second.length) {
    return false;
  }

  return crypto.subtle.timingSafeEqual(first, second);
};

const signPass = async (
  secret: string,
  claim: PassClaim,
  now: number
): Promise<string> => {
  const until = Math.floor(now / MS_PER_SECOND) + PASS_SECONDS;
  const mac = await toMac(secret, claim, until);

  return `${until}.${mac}`;
};

const verifyPass = async (
  secret: string,
  claim: PassClaim,
  value: string | null,
  now: number
): Promise<boolean> => {
  if (value === null) {
    return false;
  }

  const [untilText, mac = ""] = value.split(".");
  const until = Number(untilText);

  if (!Number.isInteger(until) || mac === "") {
    return false;
  }

  if (until <= Math.floor(now / MS_PER_SECOND)) {
    return false;
  }

  return isSameText(await toMac(secret, claim, until), mac);
};

const readCookie = (header: string | null, name: string): string | null => {
  if (header === null) {
    return null;
  }

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");

    if (key === name) {
      return rest.join("=");
    }
  }

  return null;
};

export { PASS_SECONDS, readCookie, signPass, toCookieName, toHex, verifyPass };

export type { PassClaim };
