import { Effect } from "effect";

import { PassCookieClient } from "../platform/pass-cookie-client.js";
import { readCookie, toCookieName } from "./pass-cookie.js";
import { toSalt } from "./password.js";
import { readPassword } from "./read-password.js";

const isPassed = Effect.fn("Viewer.isPassed")(function* run(
  slug: string,
  cookieHeader: string | null
) {
  const gate = yield* readPassword();

  if (gate === null || gate.passwordHash === null) {
    return false;
  }

  const salt = toSalt(gate.passwordHash);

  if (salt === null) {
    return false;
  }

  const cookies = yield* PassCookieClient;

  return yield* cookies.verify(
    { orgId: gate.orgId, publicationId: gate.publicationId, salt, slug },
    readCookie(cookieHeader, toCookieName(slug)),
    Date.now()
  );
});

export { isPassed };
