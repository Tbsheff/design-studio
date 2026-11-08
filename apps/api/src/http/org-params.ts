import { Schema } from "effect";

const ORG_PATH = "/v1/o/:orgId";

const OrgIdSchema = Schema.String;

const OrgParams = { orgId: OrgIdSchema };

export { ORG_PATH, OrgIdSchema, OrgParams };
