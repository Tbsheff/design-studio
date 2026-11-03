import { Effect } from "effect";

import {
  NOT_FOUND,
  SEE_OTHER,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from "../shared-actions.js";
import { ViewerDb } from "../tenant/viewer-db.js";
import { PASS_SECONDS, signPass, toCookieName, toHex } from "./pass-cookie.js";
import { toSalt, verifyPassword } from "./password.js";
import { readPassword } from "./read-password.js";

const encoder = new TextEncoder();

const toIpHash = async (slug: string, ip: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${slug}|${ip}`)
  );

  return toHex(digest);
};

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
  const viewerDb = yield* ViewerDb;
  const ipHash = yield* Effect.promise(async () => await toIpHash(slug, ip));
  const lock = viewerDb.lockout(ipHash);
  const state = yield* Effect.promise(async () => await lock.check());

  if (state.isLocked) {
    return toLockedResponse(state.retryAfter);
  }

  const isMatch = yield* Effect.promise(
    async () => await verifyPassword(gate.passwordHash ?? "", password)
  );

  if (!isMatch || salt === null) {
    const failed = yield* Effect.promise(async () => await lock.fail());

    if (failed.isLocked) {
      return toLockedResponse(failed.retryAfter);
    }

    return new Response("Wrong password.", {
      headers: { "cache-control": "no-store" },
      status: UNAUTHORIZED,
    });
  }

  yield* Effect.promise(async () => {
    await lock.clear();
  });

  const value = yield* Effect.promise(
    async () =>
      await signPass(
        viewerDb.cookieKey,
        { orgId: gate.orgId, publicationId: gate.publicationId, salt, slug },
        Date.now()
      )
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
