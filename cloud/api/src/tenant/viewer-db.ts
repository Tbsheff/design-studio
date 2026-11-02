import { Context, Effect, Layer, Schema } from "effect";

import { NotFound } from "../../../../src/shared/actions/_core/errors/not-found.js";
import { CloudBindings } from "../platform/bindings.js";
import { RowOrgMismatch } from "./errors/row-org-mismatch.js";
import { tq } from "./sql.js";
import { ViewerScope } from "./viewer-scope.js";

const ViewedProjectSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  org_id: Schema.String,
});

type ViewedProject = typeof ViewedProjectSchema.Type;

const projectById = tq<{ readonly projectId: string }>`
  SELECT p.org_id, p.id, p.name
  FROM project p
  WHERE p.org_id = :org AND p.id = :projectId AND p.deleted_at IS NULL`;

interface ViewerDbApi {
  readonly project: () => Effect.Effect<ViewedProject, NotFound, ViewerScope>;
}

const makeViewerDb = (db: D1Database): ViewerDbApi => ({
  project: Effect.fn("ViewerDb.project")(function* run() {
    const scope = yield* ViewerScope;
    const bound = projectById.bind(scope.orgId, { projectId: scope.projectId });

    const row = yield* Effect.promise(() =>
      db
        .prepare(projectById.sql)
        .bind(...bound)
        .first()
    );

    if (row === null) {
      return yield* new NotFound({ message: "The project does not exist." });
    }

    const project = yield* Effect.orDie(
      Schema.decodeUnknownEffect(ViewedProjectSchema)(row)
    );

    if (project.org_id !== scope.orgId) {
      return yield* Effect.die(
        new RowOrgMismatch({
          message: "a row has the wrong org_id",
          statement: projectById.sql,
        })
      );
    }

    return project;
  }),
});

class ViewerDb extends Context.Service<ViewerDb, ViewerDbApi>()(
  "design-studio/tenant/ViewerDb"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    ViewerDb,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;

      return ViewerDb.of(makeViewerDb(bindings.db));
    })
  );
}

export { ViewerDb };

export type { ViewedProject, ViewerDbApi };
