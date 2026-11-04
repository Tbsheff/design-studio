import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

import { ROLE_GRANTS, STATEMENTS } from "./permissions.js";

const accessControl = createAccessControl({
  ...defaultStatements,
  ...STATEMENTS,
  member: [...defaultStatements.member, ...STATEMENTS.member],
});

const roles = {
  admin: accessControl.newRole({
    ...adminAc.statements,
    ...ROLE_GRANTS.admin,
    member: [...adminAc.statements.member, ...(ROLE_GRANTS.admin.member ?? [])],
  }),
  member: accessControl.newRole({
    ...memberAc.statements,
    ...ROLE_GRANTS.member,
  }),
  owner: accessControl.newRole({
    ...ownerAc.statements,
    ...ROLE_GRANTS.owner,
    member: [...ownerAc.statements.member, ...(ROLE_GRANTS.owner.member ?? [])],
  }),
  viewer: accessControl.newRole({
    ...ROLE_GRANTS.viewer,
  }),
};

export { accessControl, roles };
