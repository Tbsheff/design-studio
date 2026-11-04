import { Effect } from "effect";

import type { Permission } from "@design-studio/actions/_core/permissions";
import { CLOUD_ORIGIN, CloudSession } from "../cloud/index.js";
import type { StudioRuntime } from "../main/runtime.js";
import type { Introspect, IntrospectResult } from "./key-auth.js";

const OFFLINE: IntrospectResult = { kind: "offline" };
const UNKNOWN: IntrospectResult = { kind: "unknown" };
const TIMEOUT_MS = 5000;
const NOT_FOUND = 404;

interface KeyWire {
  readonly actingUserId?: string | null;
  readonly name?: string;
  readonly perms?: readonly string[];
  readonly revoked?: boolean;
}

const toResult = (wire: KeyWire): IntrospectResult => ({
  kind: "ok",
  record: {
    actingUserId: wire.actingUserId ?? null,
    name: wire.name?.trim() || "API key",
    perms: (wire.perms ?? []) as readonly Permission[],
    revoked: wire.revoked === true,
  },
});

const fetchKey = async (
  jwt: string,
  orgId: string,
  keyId: string
): Promise<IntrospectResult> => {
  const url = new URL(
    `/v1/o/${encodeURIComponent(orgId)}/keys/${encodeURIComponent(keyId)}/introspect`,
    CLOUD_ORIGIN
  );
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${jwt}` },
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (response.status === NOT_FOUND) {
    return UNKNOWN;
  }

  if (!response.ok) {
    return OFFLINE;
  }

  return toResult((await response.json()) as KeyWire);
};

const toLookup = (
  jwt: string,
  orgId: string,
  keyId: string
): Effect.Effect<IntrospectResult, IntrospectResult> =>
  Effect.tryPromise({
    catch: () => OFFLINE,
    try: () => fetchKey(jwt, orgId, keyId),
  });

const toProgram = (
  orgId: string,
  keyId: string
): Effect.Effect<IntrospectResult, never, CloudSession> =>
  Effect.gen(function* run() {
    const session = yield* CloudSession;

    return yield* session.withToken((jwt) => toLookup(jwt, orgId, keyId));
  }).pipe(Effect.orElseSucceed(() => OFFLINE));

const createCloudIntrospect = (runtime: StudioRuntime | null): Introspect => {
  if (runtime === null) {
    return () => Promise.resolve(OFFLINE);
  }

  return (orgId, keyId) =>
    runtime.runPromise(
      toProgram(orgId, keyId) as never
    ) as Promise<IntrospectResult>;
};

export { createCloudIntrospect };
