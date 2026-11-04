import { Effect } from "effect";

import { NotFound } from "../shared-actions.js";
import { ViewerDb } from "../tenant/viewer-db.js";
import { ViewerScope } from "../tenant/viewer-scope.js";

const readShare = Effect.fn("Share.read")(function* run() {
  const scope = yield* ViewerScope;

  if (scope.kind !== "share") {
    return yield* new NotFound({ message: "The share link does not exist." });
  }

  const db = yield* ViewerDb;
  const project = yield* db.project();

  return {
    canComment: scope.canComment,
    directionId: scope.directionId,
    projectName: project.name,
    versionId: scope.versionId,
  };
});

export { readShare };
