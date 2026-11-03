import { Context, Layer } from "effect";

import { toLegacyPrincipal } from "./principal.js";
import type { Principal } from "./principal.js";

class LocalPrincipal extends Context.Service<LocalPrincipal, Principal>()(
  "design-studio/store/LocalPrincipal"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.succeed(
    LocalPrincipal,
    toLegacyPrincipal()
  );
}

export { LocalPrincipal };
