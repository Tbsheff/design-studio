import { Context, Effect, Layer, Schema } from "effect";

import { NotFound } from "../../../../src/shared/actions/_core/errors/not-found.js";
import { CloudBindings } from "../platform/bindings.js";
import { CurrentOrg } from "./current-org.js";
import { RowOrgMismatch } from "./errors/row-org-mismatch.js";
import type { ParamValues, TenantStatement } from "./sql.js";

type RowSchema<Row> = Schema.Codec<Row, unknown>;

interface BatchEntry {
  readonly statement: TenantStatement<ParamValues>;
  readonly values: ParamValues;
}

interface OrgRow {
  readonly org_id?: unknown;
}

interface TenantDbApi {
  readonly all: <Params extends ParamValues, Row>(
    statement: TenantStatement<Params>,
    values: Params,
    schema: RowSchema<Row>
  ) => Effect.Effect<readonly Row[], never, CurrentOrg>;
  readonly batch: (
    entries: readonly BatchEntry[]
  ) => Effect.Effect<readonly (readonly unknown[])[], never, CurrentOrg>;
  readonly first: <Params extends ParamValues, Row>(
    statement: TenantStatement<Params>,
    values: Params,
    schema: RowSchema<Row>
  ) => Effect.Effect<Row, NotFound, CurrentOrg>;
  readonly insert: <Params extends ParamValues>(
    statement: TenantStatement<Params>,
    values: Params
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly write: <Params extends ParamValues>(
    statement: TenantStatement<Params>,
    values: Params
  ) => Effect.Effect<void, NotFound, CurrentOrg>;
}

const mismatch = (
  statement: TenantStatement<ParamValues>,
  message: string
): Effect.Effect<never> =>
  Effect.die(new RowOrgMismatch({ message, statement: statement.sql }));

const checkRows = Effect.fn("TenantDb.checkRows")(function* run(
  statement: TenantStatement<ParamValues>,
  rows: readonly unknown[],
  orgId: string
) {
  for (const row of rows) {
    const value = (row as OrgRow | null)?.org_id;

    if (value !== orgId) {
      return yield* mismatch(statement, "a row has the wrong org_id");
    }
  }

  return rows;
});

const decodeRows = <Row>(
  rows: readonly unknown[],
  schema: RowSchema<Row>
): Effect.Effect<readonly Row[]> =>
  Effect.orDie(
    Effect.all(rows.map((row) => Schema.decodeUnknownEffect(schema)(row)))
  );

const needsReturning = (
  statement: TenantStatement<ParamValues>
): Effect.Effect<void> => {
  if (statement.kind === "select") {
    return mismatch(statement, "a write statement is needed");
  }

  if (!/\breturning\s+org_id\b/iu.test(statement.sql)) {
    return mismatch(statement, "a write needs RETURNING org_id");
  }

  return Effect.void;
};

const makeBatch = (db: D1Database): TenantDbApi["batch"] =>
  Effect.fn("TenantDb.batch")(function* run(entries) {
    const org = yield* CurrentOrg;

    const prepared = entries.map((entry) =>
      db
        .prepare(entry.statement.sql)
        .bind(...entry.statement.bind(org.orgId, entry.values))
    );

    const results = yield* Effect.promise(() => db.batch(prepared));

    return yield* Effect.all(
      entries.map((entry, index) =>
        checkRows(entry.statement, results[index]?.results ?? [], org.orgId)
      )
    );
  });

const makeDb = (db: D1Database): TenantDbApi => {
  const rowsOf = Effect.fn("TenantDb.rowsOf")(function* run(
    statement: TenantStatement<ParamValues>,
    values: ParamValues
  ) {
    const org = yield* CurrentOrg;
    const bound = statement.bind(org.orgId, values);

    const result = yield* Effect.promise(() =>
      db
        .prepare(statement.sql)
        .bind(...bound)
        .all()
    );

    return yield* checkRows(statement, result.results, org.orgId);
  });

  const writeRows = Effect.fn("TenantDb.writeRows")(function* run(
    statement: TenantStatement<ParamValues>,
    values: ParamValues
  ) {
    yield* needsReturning(statement);

    return yield* rowsOf(statement, values);
  });

  return {
    all: Effect.fn("TenantDb.all")(function* run(statement, values, schema) {
      const rows = yield* rowsOf(statement, values);

      return yield* decodeRows(rows, schema);
    }),
    batch: makeBatch(db),
    first: Effect.fn("TenantDb.first")(
      function* run(statement, values, schema) {
        const rows = yield* rowsOf(statement, values);

        if (rows.length === 0) {
          return yield* new NotFound({ message: "The item does not exist." });
        }

        return yield* Effect.orDie(Schema.decodeUnknownEffect(schema)(rows[0]));
      }
    ),
    insert: Effect.fn("TenantDb.insert")(function* run(statement, values) {
      const rows = yield* writeRows(statement, values);

      if (rows.length === 0) {
        return yield* mismatch(statement, "an insert wrote no row");
      }
    }),
    write: Effect.fn("TenantDb.write")(function* run(statement, values) {
      const rows = yield* writeRows(statement, values);

      if (rows.length === 0) {
        return yield* new NotFound({ message: "The item does not exist." });
      }

      if (rows.length > 1) {
        return yield* mismatch(statement, "a by-id write changed many rows");
      }
    }),
  };
};

class TenantDb extends Context.Service<TenantDb, TenantDbApi>()(
  "design-studio/tenant/TenantDb"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    TenantDb,
    Effect.gen(function* make() {
      const bindings = yield* CloudBindings;

      return TenantDb.of(makeDb(bindings.db));
    })
  );
}

export { TenantDb };

export type { BatchEntry, RowSchema, TenantDbApi };
