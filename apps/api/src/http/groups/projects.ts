import type { Permission } from "@design-studio/actions/_core/permissions";
import { Effect, Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/http-api";
import type { HttpApiBuilder } from "effect/http-api";

import { ProjectsRepo } from "../../tenant/repos/projects.js";
import { ORG_PATH, OrgParams } from "../org-params.js";
import { requireOrg, requirePerm } from "./authorizer.js";
import { MemberGate } from "./gates.js";
import { MEMBER_ERRORS, NotFoundWire } from "./wire-errors.js";

const PROJECT_NEEDS = {
  create: "project.create",
  delete: "project.delete",
  get: "project.read",
  list: "project.read",
  rename: "project.update",
} as const satisfies Record<string, Permission>;

const PAGE_DEFAULT = 50;

const ProjectParams = { ...OrgParams, projectId: Schema.String };

const ProjectWireSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  name: Schema.String,
  rev: Schema.Number,
  updatedAt: Schema.Number,
});

const ProjectPageWireSchema = Schema.Struct({
  cursor: Schema.NullOr(Schema.String),
  items: Schema.Array(ProjectWireSchema),
});

const errors = [...MEMBER_ERRORS, NotFoundWire];

const list = HttpApiEndpoint.get("list", `${ORG_PATH}/projects`, {
  error: errors,
  params: OrgParams,
  query: {
    cursor: Schema.optionalKey(Schema.String),
    limit: Schema.optionalKey(Schema.Int),
  },
  success: ProjectPageWireSchema,
});

const get = HttpApiEndpoint.get("get", `${ORG_PATH}/projects/:projectId`, {
  error: errors,
  params: ProjectParams,
  success: ProjectWireSchema,
});

const create = HttpApiEndpoint.post("create", `${ORG_PATH}/projects`, {
  error: errors,
  params: OrgParams,
  payload: Schema.Struct({ kind: Schema.String, name: Schema.String }),
  success: Schema.Struct({ id: Schema.String }),
});

const rename = HttpApiEndpoint.patch(
  "rename",
  `${ORG_PATH}/projects/:projectId`,
  {
    error: errors,
    params: ProjectParams,
    payload: Schema.Struct({ name: Schema.String, rev: Schema.Number }),
    success: Schema.Struct({ ok: Schema.Boolean }),
  }
);

const remove = HttpApiEndpoint.delete(
  "delete",
  `${ORG_PATH}/projects/:projectId`,
  {
    error: errors,
    params: ProjectParams,
    success: Schema.Struct({ ok: Schema.Boolean }),
  }
);

const ProjectsGroup = HttpApiGroup.make("projects")
  .add(list, get, create, rename, remove)
  .middleware(MemberGate);

interface ProjectRowLike {
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly rev: number;
  readonly updated_at: number;
}

const toWire = (row: ProjectRowLike) => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  rev: row.rev,
  updatedAt: row.updated_at,
});

const projectsHandlers = (
  handlers: HttpApiBuilder.Handlers.FromGroup<typeof ProjectsGroup>
) =>
  Effect.gen(function* make() {
    const repo = yield* ProjectsRepo;

    return handlers
      .handle("list", ({ params, query }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(PROJECT_NEEDS.list);

          const page = yield* repo.list(
            query.cursor ?? null,
            query.limit ?? PAGE_DEFAULT
          );

          return { cursor: page.cursor, items: page.items.map(toWire) };
        })
      )
      .handle("get", ({ params }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(PROJECT_NEEDS.get);

          return toWire(yield* repo.get(params.projectId));
        })
      )
      .handle("create", ({ params, payload }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(PROJECT_NEEDS.create);
          const id = crypto.randomUUID();
          yield* repo.create({ createdBy: null, id, ...payload });

          return { id };
        })
      )
      .handle("rename", ({ params, payload }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(PROJECT_NEEDS.rename);
          yield* repo.rename({ id: params.projectId, ...payload });

          return { ok: true };
        })
      )
      .handle("delete", ({ params }) =>
        Effect.gen(function* run() {
          yield* requireOrg(params.orgId);
          yield* requirePerm(PROJECT_NEEDS.delete);
          yield* repo.delete(params.projectId);

          return { ok: true };
        })
      );
  });

export { PROJECT_NEEDS, ProjectsGroup, projectsHandlers };
