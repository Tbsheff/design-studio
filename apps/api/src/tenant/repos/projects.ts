import { Context, Effect, Layer, Schema } from "effect";

import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import type { CurrentOrg } from "../current-org.js";
import { TenantDb } from "../db.js";
import { tq } from "../sql.js";

const PAGE_MAX = 100;

const ProjectRowSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  name: Schema.String,
  org_id: Schema.String,
  rev: Schema.Number,
  updated_at: Schema.Number,
});

type ProjectRow = typeof ProjectRowSchema.Type;

interface ProjectCreate {
  readonly createdBy: string | null;
  readonly id: string;
  readonly kind: string;
  readonly name: string;
}

interface ProjectRename {
  readonly id: string;
  readonly name: string;
  readonly rev: number;
}

interface ProjectPage {
  readonly cursor: string | null;
  readonly items: readonly ProjectRow[];
}

const byId = tq<{ readonly id: string }>`
  SELECT p.org_id, p.id, p.name, p.kind, p.rev, p.updated_at
  FROM project p
  WHERE p.org_id = :org AND p.id = :id AND p.deleted_at IS NULL`;

const page = tq<{ readonly after: string; readonly limit: number }>`
  SELECT p.org_id, p.id, p.name, p.kind, p.rev, p.updated_at
  FROM project p
  WHERE p.org_id = :org AND p.id > :after AND p.deleted_at IS NULL
  ORDER BY p.id
  LIMIT :limit`;

const create = tq<{
  readonly createdBy: string | null;
  readonly id: string;
  readonly kind: string;
  readonly name: string;
  readonly now: number;
}>`
  INSERT INTO project (org_id, id, name, kind, created_by, created_at, updated_at)
  VALUES (:org, :id, :name, :kind, :createdBy, :now, :now)
  RETURNING org_id`;

const rename = tq<{
  readonly id: string;
  readonly name: string;
  readonly now: number;
  readonly rev: number;
}>`
  UPDATE project SET name = :name, rev = rev + 1, updated_at = :now
  WHERE org_id = :org AND id = :id AND rev = :rev AND deleted_at IS NULL
  RETURNING org_id`;

const remove = tq<{ readonly id: string; readonly now: number }>`
  UPDATE project SET deleted_at = :now, rev = rev + 1, updated_at = :now
  WHERE org_id = :org AND id = :id AND deleted_at IS NULL
  RETURNING org_id`;

interface ProjectsRepoApi {
  readonly create: (
    input: ProjectCreate
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly delete: (id: string) => Effect.Effect<void, NotFound, CurrentOrg>;
  readonly get: (id: string) => Effect.Effect<ProjectRow, NotFound, CurrentOrg>;
  readonly list: (
    after: string | null,
    limit: number
  ) => Effect.Effect<ProjectPage, never, CurrentOrg>;
  readonly rename: (
    change: ProjectRename
  ) => Effect.Effect<void, NotFound, CurrentOrg>;
}

const toPage = (items: readonly ProjectRow[], limit: number): ProjectPage => {
  const last = items.at(-1);

  if (items.length < limit || !last) {
    return { cursor: null, items };
  }

  return { cursor: last.id, items };
};

class ProjectsRepo extends Context.Service<ProjectsRepo, ProjectsRepoApi>()(
  "design-studio/tenant/ProjectsRepo"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ProjectsRepo,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      return ProjectsRepo.of({
        create: (input) => db.insert(create, { ...input, now: Date.now() }),
        delete: (id) => db.write(remove, { id, now: Date.now() }),
        get: (id) => db.first(byId, { id }, ProjectRowSchema),
        list: Effect.fn("ProjectsRepo.list")(function* run(after, limit) {
          const size = Math.min(Math.max(1, limit), PAGE_MAX);

          const items = yield* db.all(
            page,
            { after: after ?? "", limit: size },
            ProjectRowSchema
          );

          return toPage(items, size);
        }),
        rename: (change) => db.write(rename, { ...change, now: Date.now() }),
      });
    })
  );
}

export { ProjectsRepo };

export type { ProjectCreate, ProjectPage, ProjectRename, ProjectRow };
