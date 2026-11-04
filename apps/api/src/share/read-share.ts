import { NotFound } from "@design-studio/actions/_core/errors/not-found";
import { Effect } from "effect";

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
