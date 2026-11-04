import { Context } from "effect";

interface CurrentKeyApi {
  readonly actingUserId: string;
  readonly keyId: string;
  readonly name: string;
}

class CurrentKey extends Context.Service<CurrentKey, CurrentKeyApi>()(
  "design-studio/http/CurrentKey"
) {
  declare public readonly access: "read";
}

export { CurrentKey };

export type { CurrentKeyApi };
