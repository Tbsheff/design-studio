const VAULT_MESSAGE = "studio-vault";

const MAX_DATA_LENGTH = 16_384;

const VAULT_OPS = new Set<unknown>(["seal", "open", "probe"]);

interface VaultRequest {
  type: typeof VAULT_MESSAGE;
  id: string;
  op: "seal" | "open" | "probe";
  data: string;
}

interface VaultReply {
  type: typeof VAULT_MESSAGE;
  id: string;
  ok: boolean;
  data: string;
  error: string | null;
}

interface VaultFields {
  type?: unknown;
  id?: unknown;
  op?: unknown;
  ok?: unknown;
  data?: unknown;
}

const isVaultObject = (value: unknown): value is VaultFields =>
  typeof value === "object" &&
  value !== null &&
  (value as VaultFields).type === VAULT_MESSAGE;

const hasIdAndData = (
  fields: VaultFields
): fields is VaultFields & { id: string; data: string } =>
  typeof fields.id === "string" && typeof fields.data === "string";

const isShortData = (data: unknown): data is string =>
  typeof data === "string" && data.length <= MAX_DATA_LENGTH;

const isVaultRequest = (value: unknown): value is VaultRequest =>
  isVaultObject(value) &&
  typeof value.id === "string" &&
  VAULT_OPS.has(value.op) &&
  isShortData(value.data);

const isVaultReply = (value: unknown): value is VaultReply =>
  isVaultObject(value) && hasIdAndData(value) && typeof value.ok === "boolean";

export { VAULT_MESSAGE, isVaultReply, isVaultRequest };

export type { VaultReply, VaultRequest };
