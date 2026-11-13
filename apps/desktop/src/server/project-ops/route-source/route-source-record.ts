import { Effect } from "effect";

import { setPrivateJson } from "../../platform/atomic-write/index.js";
import { getRecord, toRecordPath } from "./route-source-file.js";
import type { RouteSourceEntry } from "./route-source-file.js";

const setRecordEntry = Effect.fn("RouteSource.setRecordEntry")(function* run(
  workTree: string,
  entry: RouteSourceEntry
) {
  const record = yield* getRecord(workTree);
  const others = record.entries.filter((saved) => saved.page !== entry.page);

  yield* setPrivateJson(toRecordPath(workTree), {
    entries: [...others, entry],
  });
});

export { setRecordEntry };
