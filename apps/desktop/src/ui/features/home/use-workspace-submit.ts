import type { RunLevel } from "@design-studio/contracts";

import { api, errorText } from "../../api.js";
import { markComposerIntent } from "../../platform/focus.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";
import type { ContextDraft } from "./context-drafts-model.js";
import { call, projectRoutes } from "./deps.js";
import type { Busy } from "./home-model.js";
import { loadAppMenu } from "./lazy-parts-model.js";
import { importContexts } from "./use-context-import.js";
import type { Workspace } from "./workspace-model.js";

interface WorkspacePrototypeInput {
  readonly contexts: ContextDraft[];
  readonly images: ImageDraft[];
  readonly level: RunLevel;
  readonly onOpen: (projectId: string) => void;
  readonly prompt: string;
  readonly references: ReferenceDraft[];
  readonly setBusy: (busy: Busy) => void;
  readonly setFormError: (message: string | null) => void;
  readonly workspace: Workspace;
}

const toAnchorId = async (workspace: Workspace): Promise<string> => {
  if (workspace.anchor !== null) {
    return workspace.anchor.id;
  }

  const linked = await api.importProject(workspace.folder ?? "", {
    isWorkspace: true,
  });

  return linked.project.id;
};

const createWorkspacePrototype = async (
  input: WorkspacePrototypeInput
): Promise<string> => {
  const anchorId = await toAnchorId(input.workspace);

  const created = await call(projectRoutes.createPrototypeProject, {
    level: input.level,
    name: null,
    projectId: anchorId,
    prompt: input.prompt,
    shouldStartRun: false,
  });

  const prototypeId = created.project.id;
  await importContexts(prototypeId, input.contexts);
  const mod = await loadAppMenu();

  await mod.runInProject(prototypeId, {
    images: input.images.map((image) => image.file),
    level: input.level,
    prompt: input.prompt,
    referenceUrls: input.references.map((reference) => reference.url),
  });

  return prototypeId;
};

const runWorkspacePrototype = async (
  input: WorkspacePrototypeInput
): Promise<void> => {
  const { onOpen, setBusy, setFormError } = input;

  setBusy("create");
  setFormError(null);

  try {
    const projectId = await createWorkspacePrototype(input);
    markComposerIntent();
    onOpen(projectId);
  } catch (error: unknown) {
    setFormError(errorText(error));
    setBusy(null);
  }
};

export { runWorkspacePrototype };

export type { WorkspacePrototypeInput };
