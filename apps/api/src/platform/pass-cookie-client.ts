import { Context, Effect, Layer } from "effect";

import { CloudBindings } from "./bindings.js";

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

interface PassCookieClientApi {
  readonly sign: (claim: PassClaim, now: number) => Effect.Effect<string>;
  readonly verify: (
    claim: PassClaim,
    value: string | null,
    now: number
  ) => Effect.Effect<boolean>;
}

const toPayload = (claim: PassClaim, until: number): string =>
  [claim.orgId, claim.slug, claim.publicationId, claim.salt, until].join("|");

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(HEX_WIDTH, "0"))
    .join("");

const isSameText = (left: string, right: string): boolean => {
  const first = encoder.encode(left);
  const second = encoder.encode(right);

  if (first.length !== second.length) {
    return false;
  }

  return crypto.subtle.timingSafeEqual(first, second);
};

const toSeconds = (now: number): number => Math.floor(now / MS_PER_SECOND);

const makeMac = (
  secret: string
): ((claim: PassClaim, until: number) => Effect.Effect<string>) =>
  Effect.fn("PassCookieClient.mac")(function* run(
    claim: PassClaim,
    until: number
  ) {
    const key = yield* Effect.promise(() =>
      crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign"]
      )
    );

    const signed = yield* Effect.promise(() =>
      crypto.subtle.sign("HMAC", key, encoder.encode(toPayload(claim, until)))
    );

    return toHex(signed);
  });

class PassCookieClient extends Context.Service<
  PassCookieClient,
  PassCookieClientApi
>()("design-studio/platform/PassCookieClient") {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    PassCookieClient,
    Effect.gen(function* make() {
      const { cookieKey } = yield* CloudBindings;
      const toMac = makeMac(cookieKey);

      return PassCookieClient.of({
        sign: Effect.fn("PassCookieClient.sign")(function* run(
          claim: PassClaim,
          now: number
        ) {
          const until = toSeconds(now) + PASS_SECONDS;
          const mac = yield* toMac(claim, until);

          return `${until}.${mac}`;
        }),
        verify: Effect.fn("PassCookieClient.verify")(function* run(
          claim: PassClaim,
          value: string | null,
          now: number
        ) {
          if (value === null) {
            return false;
          }

          const [untilText, mac = ""] = value.split(".");
          const until = Number(untilText);

          if (!Number.isInteger(until) || mac === "") {
            return false;
          }

          if (until <= toSeconds(now)) {
            return false;
          }

          return isSameText(yield* toMac(claim, until), mac);
        }),
      });
    })
  );
}

export { PASS_SECONDS, PassCookieClient, toHex };

export type { PassClaim, PassCookieClientApi };
