import type { Permission } from "@design-studio/actions/_core/permissions";

interface UiPrincipal {
  readonly kind: "ui";
  readonly userId: string | null;
}

interface KeyPrincipal {
  readonly actingUserId: string | null;
  readonly keyId: string;
  readonly kind: "key";
  readonly orgId: string;
  readonly perms: readonly Permission[];
}

interface LegacyPrincipal {
  readonly kind: "legacy";
}

type Principal = KeyPrincipal | LegacyPrincipal | UiPrincipal;

const LEGACY_PRINCIPAL: LegacyPrincipal = { kind: "legacy" };

interface KeyPrincipalInput {
  readonly actingUserId: string | null;
  readonly keyId: string;
  readonly orgId: string;
  readonly perms: readonly Permission[];
}

const toLegacyPrincipal = (): Principal => LEGACY_PRINCIPAL;

const toKeyPrincipal = (input: KeyPrincipalInput): KeyPrincipal => ({
  actingUserId: input.actingUserId,
  keyId: input.keyId,
  kind: "key",
  orgId: input.orgId,
  perms: input.perms,
});

const isPermitted = (principal: Principal, needs: Permission): boolean => {
  if (principal.kind === "key") {
    return principal.perms.includes(needs);
  }

  return true;
};

export { isPermitted, toKeyPrincipal, toLegacyPrincipal };

export type {
  KeyPrincipal,
  KeyPrincipalInput,
  LegacyPrincipal,
  Principal,
  UiPrincipal,
};
