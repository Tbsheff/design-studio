import { Context } from "effect";

import type { Permission } from "../../../../src/shared/actions/_core/permissions.js";

type OrgRole = "admin" | "member" | "owner" | "viewer";

type OrgVia = "jwt" | "key" | "session" | "share";

interface CurrentOrgApi {
  readonly orgId: string;
  readonly perms: readonly Permission[];
  readonly role: OrgRole;
  readonly via: OrgVia;
}

class CurrentOrg extends Context.Service<CurrentOrg, CurrentOrgApi>()(
  "design-studio/tenant/CurrentOrg"
) {
  declare public readonly access: "read";
}

export { CurrentOrg };

export type { CurrentOrgApi, OrgRole, OrgVia };
