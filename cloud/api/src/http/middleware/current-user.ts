import { Context } from "effect";

type UserVia = "device" | "web";

interface CurrentUserApi {
  readonly email: string;
  readonly freshAt: number;
  readonly userId: string;
  readonly via: UserVia;
}

class CurrentUser extends Context.Service<CurrentUser, CurrentUserApi>()(
  "design-studio/http/CurrentUser"
) {
  declare public readonly access: "read";
}

export { CurrentUser };

export type { CurrentUserApi, UserVia };
