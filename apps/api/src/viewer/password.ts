import { Effect } from "effect";

const MIN_ROUNDS = 100_000;

const PART_COUNT = 4;

const SALT_INDEX = 2;

const HASH_INDEX = 3;

const HASH_BITS = 256;

const encoder = new TextEncoder();

const fromBase64 = (text: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(text), (char) => char.codePointAt(0) ?? 0);

const derive = Effect.fn("Viewer.derivePassword")(function* run(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  rounds: number
) {
  const key = yield* Effect.promise(() =>
    crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
      "deriveBits",
    ])
  );

  const bits = yield* Effect.promise(() =>
    crypto.subtle.deriveBits(
      { hash: "SHA-256", iterations: rounds, name: "PBKDF2", salt },
      key,
      HASH_BITS
    )
  );

  return new Uint8Array(bits);
});

const isSame = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && crypto.subtle.timingSafeEqual(left, right);

const toSalt = (stored: string): string | null => {
  const parts = stored.split("$");

  if (parts.length !== PART_COUNT || parts[0] !== "pbkdf2") {
    return null;
  }

  return parts[SALT_INDEX] ?? null;
};

const verifyPassword = Effect.fn("Viewer.verifyPassword")(function* run(
  stored: string,
  password: string
) {
  const parts = stored.split("$");
  const rounds = Number(parts[1]);

  if (
    toSalt(stored) === null ||
    !Number.isInteger(rounds) ||
    rounds < MIN_ROUNDS
  ) {
    return false;
  }

  const salt = fromBase64(parts[SALT_INDEX] ?? "");
  const expected = fromBase64(parts[HASH_INDEX] ?? "");
  const actual = yield* derive(password, salt, rounds);

  return isSame(actual, expected);
});

export { toSalt, verifyPassword };
