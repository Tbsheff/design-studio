import { Effect } from "effect";

import { Forbidden } from "../../../../../src/shared/actions/_core/errors/forbidden.js";
import { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import type { Permission } from "../../../../../src/shared/actions/_core/permissions.js";
import { CurrentOrg } from "../../tenant/current-org.js";

const requirePerm = Effect.fn("CloudAuthorizer.require")(function* run(
  needs: Permission
) {
  const org = yield* CurrentOrg;

  if (org.perms.includes(needs)) {
    return org;
  }

  return yield* new Forbidden({
    message: "You do not have permission to do this.",
    perm: needs,
  });
});

const requireOrg = Effect.fn("CloudAuthorizer.requireOrg")(function* run(
  orgId: string
) {
  const org = yield* CurrentOrg;

  if (org.orgId === orgId) {
    return org;
  }

  return yield* new NotFound({ message: "The organization does not exist." });
});

export { requireOrg, requirePerm };
