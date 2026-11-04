import { BadRequest } from "@design-studio/actions/_core/errors/bad-request";
import { Conflict } from "@design-studio/actions/_core/errors/conflict";
import { Effect } from "effect";

import { ProjectsRepo } from "../../tenant/repos/projects.js";
import { requireOrg } from "../groups/authorizer.js";
import { findRefusedFile } from "./manifest-guard.js";
import type { ManifestFile } from "./manifest-guard.js";
import { SyncSigner } from "./sync-signer.js";

const ATTACHED_KIND = "attached";

const requireCloudRef = Effect.fn("Sync.requireCloudRef")(function* run(
  orgId: string,
  projectId: string,
  sig: string
) {
  yield* requireOrg(orgId);
  const signer = yield* SyncSigner;
  const expected = yield* signer.sign(orgId, projectId);

  if (expected !== sig) {
    return yield* new Conflict({
      message: "The cloud reference does not match this project.",
    });
  }
});

const requireDetached = Effect.fn("Sync.requireDetached")(function* run(
  projectId: string
) {
  const projects = yield* ProjectsRepo;
  const project = yield* projects.get(projectId);

  if (project.kind === ATTACHED_KIND) {
    return yield* new BadRequest({
      message: "An attached project does not sync files.",
    });
  }

  return project;
});

const requireSafeManifest = Effect.fn("Sync.requireSafeManifest")(function* run(
  files: readonly ManifestFile[]
) {
  const refused = findRefusedFile(files);

  if (refused !== null) {
    return yield* new BadRequest({
      message: `The file ${refused.path} cannot sync.`,
    });
  }
});

export { requireCloudRef, requireDetached, requireSafeManifest };
