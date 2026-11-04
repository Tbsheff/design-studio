import { Effect } from "effect";

import { AuthGateway } from "../../../auth/gateway.js";
import { KeyPermRepo } from "../../../tenant/repos/key-perm.js";

interface CreateKeyInput {
  readonly name: string;
  readonly orgId: string;
  readonly perms: readonly string[];
  readonly userId: string;
}

interface CreatedKey {
  readonly id: string;
  readonly key: string;
}

interface CreateApi {
  readonly createApiKey: (input: {
    readonly body: {
      readonly configId: string;
      readonly name: string;
      readonly organizationId: string;
      readonly permissions: Record<string, string[]>;
      readonly userId: string;
    };
  }) => Promise<CreatedKey>;
}

const toGrants = (perms: readonly string[]) => {
  const grants = new Map<string, string[]>();

  for (const perm of perms) {
    const [resource = "", action = ""] = perm.split(".");
    grants.set(resource, [...(grants.get(resource) ?? []), action]);
  }

  return Object.fromEntries(grants);
};

const createKey = Effect.fn("Keys.createKey")(function* run(
  input: CreateKeyInput
) {
  const gateway = yield* AuthGateway;
  const repo = yield* KeyPermRepo;
  const api: CreateApi = gateway.api;

  const created = yield* Effect.promise(() =>
    api.createApiKey({
      body: {
        configId: "mcp",
        name: input.name,
        organizationId: input.orgId,
        permissions: toGrants(input.perms),
        userId: input.userId,
      },
    })
  );

  yield* repo.insertMeta({
    actingUserId: input.userId,
    createdBy: input.userId,
    keyId: created.id,
  });

  return { key: created.key, keyId: created.id };
});

export { createKey };
