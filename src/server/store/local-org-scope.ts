import { Context, Layer } from "effect";

import { toOrgScope } from "./org-scope.js";
import type { OrgScope } from "./org-scope.js";
import { toLegacyPrincipal } from "./principal.js";

class LocalOrgScope extends Context.Service<LocalOrgScope, OrgScope>()(
  "design-studio/store/LocalOrgScope"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LocalOrgScope,
    toOrgScope(toLegacyPrincipal())
  );
}

export { LocalOrgScope };

export type { EveryOrg, OrgScope, SomeOrgs } from "./org-scope.js";
