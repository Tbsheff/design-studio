import { Context, Effect, Layer, Ref } from "effect";

import { Unauthenticated } from "@design-studio/actions/_core/errors/unauthenticated";
import type {
  CloudOrg,
  CloudUser,
  CloudView,
} from "@design-studio/actions/cloud/schema";

interface CloudToken {
  readonly expiresAt: number;
  readonly jwt: string;
}

interface CloudProfile {
  readonly orgs: readonly CloudOrg[];
  readonly user: CloudUser;
}

interface CloudSessionRecord {
  readonly profile: CloudProfile | null;
  readonly token: CloudToken | null;
}

interface CloudSessionApi {
  readonly clear: () => Effect.Effect<void>;
  readonly current: () => Effect.Effect<CloudView>;
  readonly remember: (profile: CloudProfile) => Effect.Effect<void>;
  readonly set: (token: CloudToken) => Effect.Effect<void>;
  readonly withToken: <Value, Fail, Env>(
    run: (jwt: string) => Effect.Effect<Value, Fail, Env>
  ) => Effect.Effect<Value, Fail | Unauthenticated, Env>;
}

const EMPTY_RECORD: CloudSessionRecord = { profile: null, token: null };

const isLive = (token: CloudToken | null, now: number): token is CloudToken =>
  token !== null && token.expiresAt > now;

const toView = (record: CloudSessionRecord, now: number): CloudView => {
  if (record.token === null) {
    return { orgs: [], state: "signed-out", user: null };
  }

  if (!isLive(record.token, now)) {
    return { orgs: [], state: "expired", user: null };
  }

  return {
    orgs: record.profile?.orgs ?? [],
    state: "signed-in",
    user: record.profile?.user ?? null,
  };
};

class CloudSession extends Context.Service<CloudSession, CloudSessionApi>()(
  "design-studio/cloud/CloudSession"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    CloudSession,
    Effect.gen(function* build() {
      const ref = yield* Ref.make<CloudSessionRecord>(EMPTY_RECORD);

      return CloudSession.of({
        clear: Effect.fn("CloudSession.clear")(function* run() {
          yield* Ref.set(ref, EMPTY_RECORD);
        }),
        current: Effect.fn("CloudSession.current")(function* run() {
          const record = yield* Ref.get(ref);

          return toView(record, Date.now());
        }),
        remember: Effect.fn("CloudSession.remember")(function* run(
          profile: CloudProfile
        ) {
          yield* Ref.update(ref, (record) => ({ ...record, profile }));
        }),
        set: Effect.fn("CloudSession.set")(function* run(token: CloudToken) {
          yield* Ref.set(ref, { profile: null, token });
        }),
        withToken: Effect.fn("CloudSession.withToken")(function* run<
          Value,
          Fail,
          Env,
        >(perform: (jwt: string) => Effect.Effect<Value, Fail, Env>) {
          const record = yield* Ref.get(ref);

          if (!isLive(record.token, Date.now())) {
            return yield* new Unauthenticated({
              message: "Sign in to the cloud first.",
            });
          }

          return yield* perform(record.token.jwt);
        }),
      });
    })
  );
}

export { CloudSession };

export type { CloudProfile, CloudSessionApi, CloudToken };
