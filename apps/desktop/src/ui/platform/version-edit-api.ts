import { routes } from "@design-studio/actions/version/routes";
import type {
  SessionEndSchema,
  VersionSchema,
} from "@design-studio/actions/version/schema";
import type {
  EditHistoryState,
  EditSessionEnd,
  Version,
} from "@design-studio/contracts";

import { call } from "./http.js";

type WireVersion = typeof VersionSchema.Encoded;

interface EditHistoryStep {
  readonly label: string;
  readonly state: EditHistoryState;
  readonly version: Version;
}

const STEP_ROUTES = {
  redo: routes.applyHistoryVersion,
  undo: routes.restoreHistoryVersion,
} as const;

const END_ROUTES = {
  discard: routes.deleteSessionVersion,
  save: routes.createSessionVersion,
} as const;

const toVersion = (wire: WireVersion): Version => ({
  ...wire,
  changedFiles: [...wire.changedFiles],
  meta: { ...wire.meta },
});

const toSessionEnd = (
  wire: typeof SessionEndSchema.Encoded
): EditSessionEnd => ({
  headVersionId: wire.headVersionId,
  version: wire.version && toVersion(wire.version),
});

const restoreVersionAt = async (
  projectId: string,
  directionId: string,
  versionId: string
): Promise<Version> =>
  toVersion(
    await call(routes.restoreVersion, {
      directionId,
      projectId,
      versionId,
    })
  );

const stepEditHistoryAt = async (
  projectId: string,
  directionId: string,
  kind: "redo" | "undo"
): Promise<EditHistoryStep> => {
  const out = await call(STEP_ROUTES[kind], {
    directionId,
    projectId,
  });

  return {
    label: out.label,
    state: { ...out.state },
    version: toVersion(out.version),
  };
};

const endEditSessionAt = async (
  projectId: string,
  directionId: string,
  action: "discard" | "save",
  baseVersionId: string
): Promise<EditSessionEnd> =>
  toSessionEnd(
    await call(END_ROUTES[action], {
      baseVersionId,
      directionId,
      projectId,
    })
  );

export { endEditSessionAt, restoreVersionAt, stepEditHistoryAt };

export type { EditHistoryStep };
