import { Effect } from "effect";

import { NotFound, Unauthenticated } from "../shared-actions.js";
import { TenantBlobs } from "../tenant/blobs.js";
import { ViewerDb } from "../tenant/viewer-db.js";
import { toPublishedPath } from "./path.js";

const readSiteFile = Effect.fn("Viewer.readSiteFile")(function* run(
  rawPath: string
) {
  const path = toPublishedPath(rawPath);

  if (path === null) {
    return yield* new NotFound({ message: "The page does not exist." });
  }

  const db = yield* ViewerDb;
  const file = yield* db.readFile(path);

  if (file.isPasswordProtected) {
    return yield* new Unauthenticated({
      message: "This page needs a password.",
    });
  }

  const blobs = yield* TenantBlobs;
  const object = yield* blobs.getPublished(file.blobId);

  return { contentType: file.contentType, object };
});

export { readSiteFile };
