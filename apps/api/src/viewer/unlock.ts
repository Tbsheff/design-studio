import { Effect } from "effect";

import {
  PASS_SECONDS,
  PassCookieClient,
  toHex,
} from "../platform/pass-cookie-client.js";
import { UnlockLockoutClient } from "../platform/unlock-lockout-client.js";
import {
  NOT_FOUND,
  SEE_OTHER,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "../shared-actions.js";
import { toCookieName } from "./pass-cookie.js";
import { toSalt, verifyPassword } from "./password.js";
import { readPassword } from "./read-password.js";

const encoder = new TextEncoder();

const toIpHash = Effect.fn("Viewer.ipHash")(function* run(
  slug: string,
  ip: string
) {
  const digest = yield* Effect.promise(() =>
    crypto.subtle.digest("SHA-256", encoder.encode(`${slug}|${ip}`))
  );

  return toHex(digest);
});

const toLockedResponse = (retryAfter: number): Response =>
  new Response("Too many tries. Try again later.", {
    headers: { "cache-control": "no-store", "retry-after": `${retryAfter}` },
    status: TOO_MANY_REQUESTS,
  });

const toPassCookie = (slug: string, value: string): string =>
  `${toCookieName(slug)}=${value}; Max-Age=${PASS_SECONDS}; Path=/p/${slug}; HttpOnly; Secure; SameSite=Lax`;

const unlockSite = Effect.fn("Viewer.unlock")(function* run(
  slug: string,
  password: string,
  ip: string
) {
  const gate = yield* readPassword();

  if (gate === null || gate.passwordHash === null) {
    return new Response("Not found.", { status: NOT_FOUND });
  }

  const salt = toSalt(gate.passwordHash);
  const lockout = yield* UnlockLockoutClient;
  const ipHash = yield* toIpHash(slug, ip);
  const state = yield* lockout.check(ipHash);

  if (state.isLocked) {
    return toLockedResponse(state.retryAfter);
  }

  const isMatch = yield* verifyPassword(gate.passwordHash, password);

  if (!isMatch || salt === null) {
    const failed = yield* lockout.fail(ipHash);

    if (failed.isLocked) {
      return toLockedResponse(failed.retryAfter);
    }

    return new Response("Wrong password.", {
      headers: { "cache-control": "no-store" },
      status: UNAUTHORIZED,
    });
  }

  yield* lockout.clear(ipHash);

  const cookies = yield* PassCookieClient;

  const value = yield* cookies.sign(
    { orgId: gate.orgId, publicationId: gate.publicationId, salt, slug },
    Date.now()
  );

  return new Response(null, {
    headers: {
      "cache-control": "no-store",
      location: `/p/${slug}/`,
      "set-cookie": toPassCookie(slug, value),
    },
    status: SEE_OTHER,
  });
});

export { unlockSite };
