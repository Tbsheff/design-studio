import { Effect } from "effect";

import { CloudBindings } from "../platform/bindings.js";
import { NotFound } from "../shared-actions.js";
import { toBlobKey } from "../tenant/blobs.js";
import { PublicationRepo } from "../tenant/repos/publication.js";
import { ViewerScope } from "../tenant/viewer-scope.js";
import { toPublishedPath } from "./path.js";

const readSiteFile = Effect.fn("Viewer.readSiteFile")(function* run(
  rawPath: string
) {
  const scope = yield* ViewerScope;

  if (scope.kind !== "public") {
    return yield* new NotFound({ message: "The page does not exist." });
  }

  const path = toPublishedPath(rawPath);

  if (path === null) {
    return yield* new NotFound({ message: "The page does not exist." });
  }

  const repo = yield* PublicationRepo;
  const file = yield* repo.readFile(scope, path);
  const key = toBlobKey(scope.orgId, file.blob_id);

  if (key === null) {
    return yield* Effect.die(new Error("A published file has a bad blob id."));
  }

  const bindings = yield* CloudBindings;
  const object = yield* Effect.promise(() => bindings.files.get(key));

  if (object === null) {
    return yield* new NotFound({ message: "The file does not exist." });
  }

  return {
    contentType: file.content_type,
    hasPassword: file.has_password === 1,
    object,
  };
});

export { readSiteFile };
