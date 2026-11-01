export const VAULT_MESSAGE = "studio-vault";

export interface VaultRequest {
  type: typeof VAULT_MESSAGE;
  id: string;
  op: "seal" | "open" | "probe";
  data: string;
}

export interface VaultReply {
  type: typeof VAULT_MESSAGE;
  id: string;
  ok: boolean;
  data: string;
  error: string | null;
}

export function isVaultRequest(value: unknown): value is VaultRequest {
  const v = value as Partial<VaultRequest> | null;
  return (
    typeof v === "object" &&
    v !== null &&
    v.type === VAULT_MESSAGE &&
    typeof v.id === "string" &&
    (v.op === "seal" || v.op === "open" || v.op === "probe") &&
    typeof v.data === "string" &&
    v.data.length <= 16_384
  );
}

export function isVaultReply(value: unknown): value is VaultReply {
  const v = value as Partial<VaultReply> | null;
  return (
    typeof v === "object" &&
    v !== null &&
    v.type === VAULT_MESSAGE &&
    typeof v.id === "string" &&
    typeof v.ok === "boolean" &&
    typeof v.data === "string"
  );
}
