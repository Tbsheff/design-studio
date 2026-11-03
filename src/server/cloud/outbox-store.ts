import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { Context, Effect, Layer, Semaphore } from "effect";

import { loadConfig } from "../platform/config/index.js";
import {
  CLOUD_DIR,
  OUTBOX_FILE,
  toLine,
  toPending,
  toRowKey,
} from "./outbox.js";
import type {
  OutboxEntry,
  OutboxLine,
  OutboxRow,
  OutboxStoreApi,
} from "./outbox.js";

const toOutboxText = (file: string): Effect.Effect<string> =>
  Effect.tryPromise(() => readFile(file, "utf-8")).pipe(
    Effect.orElseSucceed(() => "")
  );

const toAppended = (file: string, line: OutboxLine): Effect.Effect<void> =>
  Effect.tryPromise(() => mkdir(path.dirname(file), { recursive: true })).pipe(
    Effect.andThen(
      Effect.tryPromise(() => appendFile(file, toLine(line), "utf-8"))
    ),
    Effect.orDie
  );

const toRewritten = (
  file: string,
  entries: readonly OutboxEntry[]
): Effect.Effect<void> =>
  Effect.tryPromise(() => mkdir(path.dirname(file), { recursive: true })).pipe(
    Effect.andThen(
      Effect.tryPromise(() =>
        writeFile(
          `${file}.tmp`,
          entries.map((entry) => toLine({ entry })).join(""),
          "utf-8"
        )
      )
    ),
    Effect.andThen(Effect.tryPromise(() => rename(`${file}.tmp`, file))),
    Effect.orDie
  );

class OutboxStore extends Context.Service<OutboxStore, OutboxStoreApi>()(
  "design-studio/cloud/OutboxStore"
) {
  declare public readonly access: "write";

  public static readonly layer = Layer.effect(
    OutboxStore,
    Effect.gen(function* build() {
      const lock = yield* Semaphore.make(1);
      const file = path.join(loadConfig().dataDir, CLOUD_DIR, OUTBOX_FILE);
      const pending = toPending(yield* toOutboxText(file));

      const write = (line: OutboxLine): Effect.Effect<void> =>
        toAppended(file, line);

      return OutboxStore.of({
        ack: Effect.fn("OutboxStore.ack")(function* run(
          rows: readonly OutboxRow[]
        ) {
          return yield* lock.withPermits(1)(
            Effect.gen(function* acknowledge() {
              let removed = 0;

              for (const row of rows) {
                const current = pending.get(toRowKey(row));

                if (
                  (current?.rowRev ?? Number.POSITIVE_INFINITY) <= row.rowRev
                ) {
                  pending.delete(toRowKey(row));
                  yield* write({ ack: row });
                  removed += 1;
                }
              }

              return removed;
            })
          );
        }),
        append: Effect.fn("OutboxStore.append")(function* run(
          entry: OutboxEntry
        ) {
          yield* lock.withPermits(1)(
            Effect.gen(function* add() {
              const current = pending.get(toRowKey(entry));

              if ((current?.rowRev ?? -1) > entry.rowRev) {
                return;
              }

              pending.set(toRowKey(entry), entry);
              yield* write({ entry });
            })
          );
        }),
        compact: Effect.fn("OutboxStore.compact")(function* run() {
          yield* lock.withPermits(1)(toRewritten(file, [...pending.values()]));
        }),
        listPending: Effect.fn("OutboxStore.listPending")(function* run(
          limit: number
        ) {
          return yield* lock.withPermits(1)(
            Effect.sync(() => [...pending.values()].slice(0, limit))
          );
        }),
      });
    })
  );
}

export { OutboxStore };
