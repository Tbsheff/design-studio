import { Effect } from "effect";

import { NotFound, Unauthenticated } from "../shared-actions.js";
import { TenantBlobs } from "../tenant/blobs.js";
import { ViewerDb } from "../tenant/viewer-db.js";
import { isPassed } from "./gate.js";
import { toPublishedPath } from "./path.js";

const readSiteFile = Effect.fn("Viewer.readSiteFile")(function* run(
  slug: string,
  rawPath: string,
  cookieHeader: string | null
) {
  const path = toPublishedPath(rawPath);

  if (path === null) {
    return yield* new NotFound({ message: "The page does not exist." });
  }

  const db = yield* ViewerDb;
  const file = yield* db.readFile(path);

  if (file.isPasswordProtected && !(yield* isPassed(slug, cookieHeader))) {
    return yield* new Unauthenticated({
      message: "This page needs a password.",
    });
  }

  const blobs = yield* TenantBlobs;
  const object = yield* blobs.getPublished(file.blobId);

  return {
    contentType: file.contentType,
    isPasswordProtected: file.isPasswordProtected,
    object,
  };
});

export { readSiteFile };
