import { Context, Effect, Layer, Option, Schema } from "effect";

import { Forbidden } from "../../../../../src/shared/actions/_core/errors/forbidden.js";
import { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import { Unauthenticated } from "../../../../../src/shared/actions/_core/errors/unauthenticated.js";
import { AuthGateway } from "../../auth/gateway.js";
import { CurrentOrg } from "../../tenant/current-org.js";
import type { CurrentOrgApi, OrgVia } from "../../tenant/current-org.js";
import { toAuthCalls } from "./auth-calls.js";
import type { AuthCalls, DevicePayload } from "./auth-calls.js";
import { isApiKey, toBearer } from "./bearer.js";
import { CurrentUser } from "./current-user.js";
import type { CurrentUserApi, UserVia } from "./current-user.js";
import { MemberDirectory } from "./member-directory.js";
import { toOrgGrant } from "./org-grant.js";

type RouteClass = "admin" | "device" | "web";

interface MemberRequest {
  readonly orgId: string;
  readonly request: Request;
  readonly route: RouteClass;
}

interface MemberGrant {
  readonly org: CurrentOrgApi;
  readonly user: CurrentUserApi;
}

type MemberAuthError = Forbidden | NotFound | Unauthenticated;

interface MemberAuthApi {
  readonly authenticate: (
    input: MemberRequest
  ) => Effect.Effect<MemberGrant, MemberAuthError>;
}

const FRESH_WINDOW_MS = 600_000;

const SECOND_MS = 1000;

const DEVICE_AUDIENCE = "device";

const FRESH_PERM = "fresh_web_session";

const toUnauthenticated = (): Unauthenticated =>
  new Unauthenticated({ message: "Sign in to Design Studio, then try again." });

const DevicePayloadSchema = Schema.Struct({
  aud: Schema.Union([Schema.String, Schema.Array(Schema.String)]),
  email: Schema.optionalKey(Schema.String),
  iat: Schema.Number,
  sub: Schema.String,
});

const decodeDevicePayload = Schema.decodeUnknownOption(DevicePayloadSchema);

const toDeviceUser = (payload: DevicePayload | null): CurrentUserApi | null => {
  const decoded = Option.getOrNull(decodeDevicePayload(payload));

  if (decoded === null || ![decoded.aud].flat().includes(DEVICE_AUDIENCE)) {
    return null;
  }

  return {
    email: decoded.email ?? "",
    freshAt: decoded.iat * SECOND_MS,
    userId: decoded.sub,
    via: "device",
  };
};

const toOrgVia = (via: UserVia): OrgVia => {
  if (via === "device") {
    return "jwt";
  }

  return "session";
};

const checkRoute = (
  user: CurrentUserApi,
  route: RouteClass,
  now: number
): Effect.Effect<void, Forbidden> => {
  const isDeviceOnWebRoute = user.via === "device" && route !== "device";
  const isStale = route === "admin" && now - user.freshAt > FRESH_WINDOW_MS;

  if (isDeviceOnWebRoute || isStale) {
    return Effect.fail(
      new Forbidden({
        message: "Sign in again in the web app, then try again.",
        perm: FRESH_PERM,
      })
    );
  }

  return Effect.void;
};

type UserReader = (
  request: Request
) => Effect.Effect<CurrentUserApi, Unauthenticated>;

const toUserReader = (calls: AuthCalls): UserReader => {
  const readWeb = Effect.fn("MemberAuth.readWeb")(function* run(
    request: Request
  ) {
    const result = yield* Effect.tryPromise({
      catch: toUnauthenticated,
      try: () =>
        calls.getSession({
          headers: request.headers,
          query: { disableCookieCache: true },
        }),
    });

    if (result === null) {
      return yield* toUnauthenticated();
    }

    return {
      email: result.user.email,
      freshAt: result.session.createdAt.getTime(),
      userId: result.user.id,
      via: "web",
    } satisfies CurrentUserApi;
  });

  const readDevice = Effect.fn("MemberAuth.readDevice")(function* run(
    token: string
  ) {
    const result = yield* Effect.tryPromise({
      catch: toUnauthenticated,
      try: () => calls.verifyJWT({ body: { token } }),
    });

    const user = toDeviceUser(result?.payload ?? null);

    if (user === null) {
      return yield* toUnauthenticated();
    }

    return user;
  });

  const readUser = Effect.fn("MemberAuth.readUser")(function* run(
    request: Request
  ) {
    const bearer = toBearer(request);

    if (bearer === null) {
      return yield* readWeb(request);
    }

    if (isApiKey(bearer)) {
      return yield* toUnauthenticated();
    }

    return yield* readDevice(bearer);
  });

  return readUser;
};

class MemberAuth extends Context.Service<MemberAuth, MemberAuthApi>()(
  "design-studio/http/MemberAuth"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    MemberAuth,
    Effect.gen(function* make() {
      const gateway = yield* AuthGateway;
      const directory = yield* MemberDirectory;

      const readUser = toUserReader(toAuthCalls(gateway.api));

      const authenticate = Effect.fn("MemberAuth.authenticate")(function* run(
        input: MemberRequest
      ) {
        const user = yield* readUser(input.request);

        yield* checkRoute(user, input.route, Date.now());

        const roleText = yield* directory.readRole(input.orgId, user.userId);
        const grant = toOrgGrant(roleText);

        if (grant === null) {
          return yield* new NotFound({
            message: "The organization does not exist.",
          });
        }

        const org: CurrentOrgApi = {
          orgId: input.orgId,
          perms: grant.perms,
          role: grant.role,
          via: toOrgVia(user.via),
        };

        return { org, user } satisfies MemberGrant;
      });

      return MemberAuth.of({ authenticate });
    })
  );
}

const withMember =
  (input: MemberRequest) =>
  <Value, Failure, Needs>(
    handler: Effect.Effect<Value, Failure, Needs>
  ): Effect.Effect<
    Value,
    Failure | MemberAuthError,
    Exclude<Needs, CurrentOrg | CurrentUser> | MemberAuth
  > =>
    Effect.gen(function* run() {
      const auth = yield* MemberAuth;
      const grant = yield* auth.authenticate(input);

      return yield* handler.pipe(
        Effect.provideService(CurrentOrg, grant.org),
        Effect.provideService(CurrentUser, grant.user)
      );
    });

export { MemberAuth, withMember };

export type { MemberAuthApi, MemberAuthError, MemberRequest, RouteClass };
