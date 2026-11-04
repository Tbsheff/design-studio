import type { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Context, Effect, Layer, Schema } from "effect";

import type { CurrentOrg } from "../current-org.js";
import { TenantDb, toBatchEntry } from "../db.js";
import { tq } from "../sql.js";

const PAGE_MAX = 100;

const ChangeRowSchema = Schema.Struct({
  actor_id: Schema.NullOr(Schema.String),
  created_at: Schema.Number,
  device_id: Schema.NullOr(Schema.String),
  id: Schema.String,
  op: Schema.Literals(["insert", "update", "delete"]),
  org_id: Schema.String,
  row_id: Schema.String,
  row_rev: Schema.Number,
  seq: Schema.Number,
  table_name: Schema.String,
});

type ChangeRow = typeof ChangeRowSchema.Type;

interface ChangeAppend {
  readonly actorId: string | null;
  readonly deviceId: string | null;
  readonly id: string;
  readonly op: "delete" | "insert" | "update";
  readonly rowId: string;
  readonly rowRev: number;
  readonly tableName: string;
}

interface ChangePage {
  readonly cursor: number | null;
  readonly items: readonly ChangeRow[];
}

const append = tq<{
  readonly actorId: string | null;
  readonly deviceId: string | null;
  readonly id: string;
  readonly now: number;
  readonly op: string;
  readonly rowId: string;
  readonly rowRev: number;
  readonly tableName: string;
}>`
  INSERT INTO change_log (org_id, id, seq, table_name, row_id, row_rev, op, actor_id, device_id, created_at)
  SELECT :org, :id, COALESCE(MAX(c.seq), 0) + 1, :tableName, :rowId, :rowRev, :op, :actorId, :deviceId, :now
  FROM change_log c
  WHERE c.org_id = :org
  RETURNING org_id`;

const page = tq<{ readonly after: number; readonly limit: number }>`
  SELECT c.org_id, c.id, c.seq, c.table_name, c.row_id, c.row_rev, c.op, c.actor_id, c.device_id, c.created_at
  FROM change_log c
  WHERE c.org_id = :org AND c.seq > :after
  ORDER BY c.seq
  LIMIT :limit`;

const head = tq<Record<never, never>>`
  SELECT c.org_id, c.id, c.seq, c.table_name, c.row_id, c.row_rev, c.op, c.actor_id, c.device_id, c.created_at
  FROM change_log c
  WHERE c.org_id = :org
  ORDER BY c.seq DESC
  LIMIT 1`;

interface ChangesRepoApi {
  readonly append: (
    input: ChangeAppend
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly appendAll: (
    inputs: readonly ChangeAppend[]
  ) => Effect.Effect<void, never, CurrentOrg>;
  readonly head: () => Effect.Effect<ChangeRow, NotFound, CurrentOrg>;
  readonly list: (
    after: number,
    limit: number
  ) => Effect.Effect<ChangePage, never, CurrentOrg>;
}

const toPage = (items: readonly ChangeRow[], limit: number): ChangePage => {
  const last = items.at(-1);

  if (items.length < limit || !last) {
    return { cursor: null, items };
  }

  return { cursor: last.seq, items };
};

class ChangesRepo extends Context.Service<ChangesRepo, ChangesRepoApi>()(
  "design-studio/tenant/ChangesRepo"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    ChangesRepo,
    Effect.gen(function* make() {
      const db = yield* TenantDb;

      return ChangesRepo.of({
        append: (input) => db.insert(append, { ...input, now: Date.now() }),
        appendAll: (inputs) =>
          db.writeAll(
            inputs.map((input) =>
              toBatchEntry(append, { ...input, now: Date.now() })
            )
          ),
        head: () => db.first(head, {}, ChangeRowSchema),
        list: Effect.fn("ChangesRepo.list")(function* run(after, limit) {
          const size = Math.min(Math.max(1, limit), PAGE_MAX);

          const items = yield* db.all(
            page,
            { after, limit: size },
            ChangeRowSchema
          );

          return toPage(items, size);
        }),
      });
    })
  );
}

export { ChangesRepo };

export type { ChangeAppend, ChangePage, ChangeRow };
