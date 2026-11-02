import { TenantViolation } from "./errors/tenant-violation.js";

type TableClass = "GLOBAL_AUTH" | "GLOBAL_INFRA" | "GLOBAL_RESOLVER" | "TENANT";

const GLOBAL_AUTH_TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "organization",
  "member",
  "invitation",
  "apikey",
  "jwks",
  "deviceCode",
  "passkey",
] as const;

const GLOBAL_RESOLVER_TABLES = ["share_token", "publication_slug"] as const;

const GLOBAL_INFRA_TABLES = ["key_meta"] as const;

const TENANT_TABLES = [
  "project",
  "direction",
  "version",
  "blob_ref",
  "version_file",
  "version_name",
  "comment",
  "comment_reply",
  "attachment",
  "layer_lock",
  "design_rule",
  "design_pack",
  "pack_version",
  "ship_settings",
  "project_setting_policy",
  "run_summary",
  "mcp_activity",
  "share",
  "share_frame",
  "publication",
  "publication_version",
  "publication_file",
  "publication_comment",
  "daily_views",
  "org_seq",
  "change_log",
  "audit_log",
  "device",
  "agent_request",
  "approval",
] as const;

const CLASS_TABLES: readonly (readonly [TableClass, readonly string[]])[] = [
  ["GLOBAL_AUTH", GLOBAL_AUTH_TABLES],
  ["GLOBAL_RESOLVER", GLOBAL_RESOLVER_TABLES],
  ["GLOBAL_INFRA", GLOBAL_INFRA_TABLES],
  ["TENANT", TENANT_TABLES],
];

const refuse = (table: string, reason: string): never => {
  throw new TenantViolation({
    message: `The table registry refuses ${table}: ${reason}.`,
    statement: table,
  });
};

const buildRegistry = (): ReadonlyMap<string, TableClass> => {
  const registry = new Map<string, TableClass>();

  for (const [tableClass, tables] of CLASS_TABLES) {
    for (const table of tables) {
      const key = table.toLowerCase();

      if (registry.has(key)) {
        refuse(table, "the table is in more than one class");
      }

      registry.set(key, tableClass);
    }
  }

  return registry;
};

const REGISTRY = buildRegistry();

const tableClassOf = (table: string): TableClass => {
  const found = REGISTRY.get(table.toLowerCase());

  if (!found) {
    return refuse(table, "the table is not in the registry");
  }

  return found;
};

const isTenantTable = (table: string): boolean =>
  tableClassOf(table) === "TENANT";

export { isTenantTable, tableClassOf, TENANT_TABLES };

export type { TableClass };
