import { Context, Effect, Layer, Schema } from "effect";

import type { NotFound } from "../../../../../src/shared/actions/_core/errors/not-found.js";
import { TenantDb } from "../db.js";
import { tq } from "../sql.js";

const PAGE_MAX = 100;

const ProjectRowSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  org_id: Schema.String,
  rev: Schema.Number,
});

type ProjectRow = typeof ProjectRowSchema.Type;

interface Rename {
  readonly id: string;
  readonly name: string;
  readonly rev: number;
}

const byId = tq<{ readonly id: string }>`
  SELECT p.org_id, p.id, p.name, p.rev
  FROM projects p
  WHERE p.org_id = :org AND p.id = :id`;

const page = tq<{ readonly after: string; readonly limit: number }>`
  SELECT p.org_id, p.id, p.name, p.rev
  FROM projects p
  WHERE p.org_id = :org AND p.id > :after
  ORDER BY p.id
  LIMIT :limit`;

const rename = tq<{
  readonly id: string;
  readonly name: string;
  readonly rev: number;
}>`
  UPDATE projects SET name = :name, rev = rev + 1
  WHERE org_id = :org AND id = :id AND rev = :rev
  RETURNING org_id`;

interface ProjectsRepoApi {
  readonly get: (id: string) => Effect.Effect<ProjectRow, NotFound>;
  readonly list: (after: string) => Effect.Effect<readonly ProjectRow[]>;
  readonly rename: (change: Rename) => Effect.Effect<void, NotFound>;
}

class ProjectsRepo extends Context.Service<ProjectsRepo, ProjectsRepoApi>()(
  "cloud/tenant/ProjectsRepo"
) {
  public static readonly layer = Layer.effect(
    ProjectsRepo,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      return ProjectsRepo.of({
        get: (id) => db.first(byId, { id }, ProjectRowSchema),
        list: (after) =>
          db.all(page, { after, limit: PAGE_MAX }, ProjectRowSchema),
        rename: (change) => db.write(rename, change),
      });
    })
  );
}

export { ProjectsRepo };

export type { ProjectRow };
