import { Effect } from "effect";

import { ViewerDb } from "../tenant/viewer-db.js";
import { ViewerScope } from "../tenant/viewer-scope.js";

const readPassword = Effect.fn("Viewer.readPassword")(function* run() {
  const scope = yield* ViewerScope;

  if (scope.kind !== "public") {
    return null;
  }

  const viewerDb = yield* ViewerDb;
  const hash = yield* viewerDb.passwordHash();

  return {
    orgId: scope.orgId,
    passwordHash: hash,
    publicationId: scope.publicationId,
  };
});

export { readPassword };
