import { Context, Layer } from "effect";

import type { OrgScope } from "./org-scope.js";
import { toPrincipalScope } from "./org-visibility.js";
import { toLegacyPrincipal } from "./principal.js";

class LocalOrgScope extends Context.Service<LocalOrgScope, OrgScope>()(
  "design-studio/store/LocalOrgScope"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LocalOrgScope,
    toPrincipalScope(toLegacyPrincipal())
  );
}

export { LocalOrgScope };

export type { EveryOrg, OrgScope, SomeOrgs } from "./org-scope.js";
