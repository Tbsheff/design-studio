import { Effect } from "effect";

import { Forbidden } from "@design-studio/actions/_core/errors/forbidden";
import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { Permission } from "@design-studio/actions/_core/permissions";
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
