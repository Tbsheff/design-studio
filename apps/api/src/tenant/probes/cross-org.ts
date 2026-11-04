import { Effect, Exit } from "effect";

import type { CurrentOrgApi } from "../current-org.js";
import { CurrentOrg } from "../current-org.js";
import type { TenantDbApi } from "../db.js";
import { ProjectsRepo } from "../repos/projects.js";
import type { ViewerScope } from "../viewer-scope.js";

interface CrossOrgResult {
  readonly isBlocked: boolean;
  readonly message: string;
  readonly name: string;
}

type NeedsOf<Program> =
  Program extends Effect.Effect<infer _Value, infer _Failure, infer Needs>
    ? Needs
    : never;

type TenantNeeds = NeedsOf<ReturnType<TenantDbApi["write"]>>;

type ViewerBuildsTenantDb = [TenantNeeds] extends [ViewerScope] ? true : false;

const LIST_LIMIT = 100;

const viewerBuildsTenantDb: ViewerBuildsTenantDb = false;

const orgOf = (orgId: string): CurrentOrgApi => ({
  orgId,
  perms: [],
  role: "owner",
  via: "session",
});

const asOrg =
  (orgId: string) =>
  <Value, Failure>(
    program: Effect.Effect<Value, Failure, CurrentOrg>
  ): Effect.Effect<Value, Failure> =>
    Effect.provideService(program, CurrentOrg, orgOf(orgId));

const expectNotFound = <Value, Failure>(
  name: string,
  effect: Effect.Effect<Value, Failure>
): Effect.Effect<CrossOrgResult> =>
  Effect.map(Effect.exit(effect), (exit) => {
    if (Exit.isFailure(exit)) {
      return { isBlocked: true, message: String(exit.cause), name };
    }

    return { isBlocked: false, message: "the call saw org B data", name };
  });

const runCrossOrgProbe = Effect.fn("CrossOrgProbe.run")(function* run(
  orgA: string,
  orgB: string
) {
  const repo = yield* ProjectsRepo;
  const projectId = `probe-${crypto.randomUUID()}`;

  yield* asOrg(orgB)(
    repo.create({
      createdBy: null,
      id: projectId,
      kind: "design",
      name: "probe",
    })
  );

  const get = yield* expectNotFound("get", asOrg(orgA)(repo.get(projectId)));

  const rename = yield* expectNotFound(
    "rename",
    asOrg(orgA)(repo.rename({ id: projectId, name: "taken", rev: 0 }))
  );

  const remove = yield* expectNotFound(
    "delete",
    asOrg(orgA)(repo.delete(projectId))
  );

  const listed = yield* asOrg(orgA)(repo.list(null, LIST_LIMIT));
  const isListBlocked = listed.items.every((item) => item.id !== projectId);

  const list: CrossOrgResult = {
    isBlocked: isListBlocked,
    message: `${listed.items.length} rows for org A`,
    name: "list",
  };

  yield* asOrg(orgB)(repo.delete(projectId));

  return [get, rename, remove, list];
});

export { runCrossOrgProbe, viewerBuildsTenantDb };

export type { CrossOrgResult };
