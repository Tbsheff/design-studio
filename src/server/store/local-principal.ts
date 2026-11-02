import { Context, Layer } from "effect";

import type { Permission } from "../../shared/actions/_core/permissions.js";

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

const toLegacyPrincipal = (): Principal => LEGACY_PRINCIPAL;

class LocalPrincipal extends Context.Service<LocalPrincipal, Principal>()(
  "design-studio/store/LocalPrincipal"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LocalPrincipal,
    toLegacyPrincipal()
  );
}

export { LocalPrincipal, toLegacyPrincipal };

export type { KeyPrincipal, LegacyPrincipal, Principal, UiPrincipal };
