import type { RunLevel } from "@design-studio/contracts";
import { parseEnvText } from "@design-studio/contracts/app";

import { ApiError, api } from "../../api.js";
import type { AppChip } from "./app-chip-model.js";
import { copy } from "./copy.js";

const RETRY_MS = 1000;

const RETRY_LIMIT = 20;

const CONFLICT_STATUS = 409;

interface AttachRequest {
  readonly folder: string;
  readonly appDir: string;
  readonly url: string | null;
  readonly env: Record<string, string>;
}

interface ChipRunInput {
  readonly prompt: string;
  readonly level: RunLevel;
  readonly images: File[];
  readonly referenceUrls: string[];
}

interface UrlPart {
  readonly url?: string;
}

interface AttachmentPart {
  readonly attachmentIds?: string[];
}

interface ReferencePart {
  readonly referenceUrls?: string[];
}

const toUrlPart = (url: string | null): UrlPart => {
  if (url === null) {
    return {};
  }

  return { url };
};

const toAttachmentPart = (ids: string[]): AttachmentPart => {
  if (ids.length === 0) {
    return {};
  }

  return { attachmentIds: ids };
};

const toReferencePart = (urls: string[]): ReferencePart => {
  if (urls.length === 0) {
    return {};
  }

  return { referenceUrls: urls };
};

const toAttachRequest = (chip: AppChip): AttachRequest => {
  const found = chip.inspection;

  if (!found) {
    throw new Error(copy.folderStillChecked);
  }

  const parsed = parseEnvText(chip.env);

  if (parsed.bad.length > 0) {
    throw new Error(`${copy.useKeyValueLines} ${parsed.bad[0] ?? ""}`);
  }

  if (chip.mode === "url" && !chip.url.trim()) {
    throw new Error(copy.typeDevUrl);
  }

  let url: string | null = null;

  if (chip.mode === "url") {
    url = chip.url.trim();
  }

  return {
    appDir: chip.appDir ?? found.appDir ?? ".",
    env: parsed.env,
    folder: found.path,
    url,
  };
};

const toTokenProjectId = async (
  path: string,
  projectId: string | null
): Promise<string> => {
  if (projectId) {
    return projectId;
  }

  const imported = await api.importProject(path, { skipApp: true });

  return imported.project.id;
};

const startChip = async (
  chip: AppChip,
  tokensOnly: boolean
): Promise<string> => {
  const found = chip.inspection;

  if (!found?.kind || found.problem) {
    throw new Error(found?.problem ?? copy.pickAnApp);
  }

  if (tokensOnly || found.kind !== "next") {
    return await toTokenProjectId(found.path, found.projectId);
  }

  if (found.projectId && chip.mode === "start" && !chip.env.trim()) {
    return found.projectId;
  }

  const attach = toAttachRequest(chip);

  const attached = await api.attachApp({
    appDir: attach.appDir,
    env: attach.env,
    folder: attach.folder,
    ...toUrlPart(attach.url),
  });

  return attached.project.id;
};

const runDelay = async (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<null>();
  globalThis.setTimeout(() => resolve(null), ms);
  await promise;
};

const startRunWithRetry = async (
  projectId: string,
  directionId: string,
  request: Parameters<typeof api.startRun>[2],
  attempt: number
): Promise<void> => {
  try {
    await api.startRun(projectId, directionId, request);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== CONFLICT_STATUS ||
      attempt >= RETRY_LIMIT
    ) {
      throw error;
    }

    await runDelay(RETRY_MS);
    await startRunWithRetry(projectId, directionId, request, attempt + 1);
  }
};

const runInProject = async (
  projectId: string,
  input: ChipRunInput
): Promise<void> => {
  const project = await api.getProject(projectId);

  const main =
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0];

  if (!main) {
    throw new Error(copy.projectHasNoDirection);
  }

  const uploaded = await Promise.all(
    input.images.map((file) => api.uploadAttachment(projectId, file))
  );

  const request = {
    level: input.level,
    mode: "edit" as const,
    prompt: input.prompt,
    ...toAttachmentPart(uploaded.map((item) => item.id)),
    ...toReferencePart(input.referenceUrls),
  };

  await startRunWithRetry(projectId, main.id, request, 0);
};

export { startChip as openChip, runInProject };

export type { ChipRunInput };
