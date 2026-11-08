import type {
  Project,
  ProjectKind,
  ProjectSettings,
  RunLevel,
} from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import type { WorkspaceList } from "@design-studio/contracts/folders";

import { api } from "../../api.js";
import { homeVariations } from "../../platform/storage.js";
import { modelLabel } from "../chat/settings-draft-model.js";
import type { AppChip } from "./app-chip-model.js";
import { chipName, chipProblem } from "./chip-logic-model.js";
import type { ImageDraft, ReferenceDraft } from "./composer-drafts-model.js";

type Busy = "create" | "ask" | "starter" | null;

type Pop = "plus" | "pack" | "level" | "model" | "folder" | null;

const EXAMPLES = [
  "Wireframe a settings page",
  "Prototype a dashboard for tracking orders",
  "A pricing page for a developer tool with three tiers",
  "Turn my notes into a one-page brief",
  "A mobile onboarding flow for a running app",
];

const EXAMPLE_MS = 3500;

const LEVEL_LABEL: Record<RunLevel, string> = {
  polish: "Polish",
  prototype: "Prototype",
  wireframe: "Wireframe",
};

const PLACEHOLDER =
  "Describe what to design. Drop an app folder, an image or a link to build on it.";

const HOME_REASON_ID = "home-send-reason";

const EMPTY_PROMPT = "Describe the design first";

const getFolderLabel = (
  list: WorkspaceList | null,
  location: string | null
): string => {
  const folders = list?.folders ?? [];

  const match =
    folders.find((folder) => folder.path === location) ??
    folders.find((folder) => folder.default);

  return match?.label ?? "Design Studio";
};

const getModelSummary = (model: string, count: number): string => {
  let extra = "";

  if (count > 1) {
    extra = ` · ${count}×`;
  }

  return `${modelLabel(model).replace(/^Claude /u, "")}${extra}`;
};

const getHomeSendBlocker = (
  busy: Busy,
  prompt: string,
  asking: boolean,
  chip: AppChip | null
): string | null => {
  if (busy !== null) {
    return "Working on it";
  }

  if (chip) {
    if (chip.isChecking) {
      return "Checking the folder";
    }

    return chipProblem(chip);
  }

  if (asking) {
    return "Answer or skip the questions below";
  }

  if (!prompt.trim()) {
    return EMPTY_PROMPT;
  }

  return null;
};

interface HomeCreateInput {
  readonly prompt: string;
  readonly kind: ProjectKind;
  readonly settings: ProjectSettings;
  readonly designMd: string;
  readonly packId: string | null;
  readonly designCount: number;
  readonly location: string | null;
  readonly images: ImageDraft[];
  readonly references: ReferenceDraft[];
}

type CreateRequest = Parameters<typeof api.createProject>[0];

const toCreateRequest = (
  input: HomeCreateInput,
  isStartingRun: boolean
): CreateRequest => {
  const request: CreateRequest = {
    kind: input.kind,
    level: input.settings.defaultLevel,
    prompt: input.prompt,
    settings: input.settings,
  };

  if (input.designMd.trim()) {
    request.designMd = input.designMd;
  }

  if (input.packId) {
    request.packId = input.packId;
  }

  if (input.location) {
    request.parentPath = input.location;
  }

  if (!isStartingRun) {
    request.startRun = false;
  }

  if (input.references.length > 0) {
    request.referenceUrls = input.references.map((reference) => reference.url);
  }

  return request;
};

type RunRequestInput = Parameters<typeof api.startRun>[2];

const toEditRunRequest = (
  input: HomeCreateInput,
  attachmentIds: string[]
): RunRequestInput => {
  const request: RunRequestInput = {
    attachmentIds,
    level: input.settings.defaultLevel,
    mode: "edit",
    prompt: input.prompt,
  };

  if (input.references.length > 0) {
    request.referenceUrls = input.references.map((reference) => reference.url);
  }

  return request;
};

const createFromHome = async (input: HomeCreateInput): Promise<Project> => {
  const fanOut = input.designCount > 1;
  const separateRun = !fanOut && input.images.length > 0;

  const { project } = await api.createProject(
    toCreateRequest(input, !(fanOut || separateRun))
  );

  if (fanOut) {
    homeVariations.set({
      count: input.designCount,
      level: input.settings.defaultLevel,
      projectId: project.id,
      prompt: input.prompt,
    });
  }

  const main =
    project.directions.find((direction) => direction.id === "main") ??
    project.directions[0];

  if (separateRun && main) {
    const uploaded = await Promise.all(
      input.images.map((image) => api.uploadAttachment(project.id, image.file))
    );

    await api.startRun(
      project.id,
      main.id,
      toEditRunRequest(
        input,
        uploaded.map((item) => item.id)
      )
    );
  }

  return project;
};

const hasFiles = (event: DragEvent): boolean =>
  [...(event.dataTransfer?.types ?? [])].includes("Files");

const getPromptPlaceholder = (
  chip: AppChip | null,
  empty: boolean
): string | null => {
  if (chip) {
    return `Describe a change to ${chipName(chip)}, or press Return to open it`;
  }

  if (empty) {
    return PLACEHOLDER;
  }

  return null;
};

const getReasonId = (blocker: string | null): string | null => {
  if (blocker && blocker !== EMPTY_PROMPT) {
    return HOME_REASON_ID;
  }

  return null;
};

const isEmpty = (projects: Project[] | null): boolean =>
  projects !== null &&
  projects.filter((project) => !project.designSystemDeleted).length === 0;

const getHome = (workspaces: WorkspaceList | null): string | null =>
  workspaces?.homeDir ?? null;

const toShortHome = (target: string, homeDir: string | null): string =>
  shortenHome(target.replace(/^\/private(?=\/)/u, ""), homeDir);

interface DesignCount {
  readonly value: number;
  readonly max: number;
  readonly onChange: (count: number) => void;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

interface KeyedFlag {
  readonly key: string;
  readonly isOn: boolean;
}

interface KeyedUrl {
  readonly key: string;
  readonly url: string;
}

interface StarProps {
  readonly isFilled: boolean;
  readonly size?: number;
}

export {
  EMPTY_PROMPT,
  EXAMPLES,
  EXAMPLE_MS,
  HOME_REASON_ID,
  LEVEL_LABEL,
  PLACEHOLDER,
  createFromHome,
  getFolderLabel as folderLabel,
  hasFiles,
  getHome as homeOf,
  getHomeSendBlocker as homeSendBlocker,
  isEmpty,
  getModelSummary as modelSummary,
  getPromptPlaceholder as promptPlaceholder,
  getReasonId as reasonId,
  toShortHome as shortHome,
};

export type {
  Busy,
  DesignCount,
  HomeCreateInput,
  KeyedFlag,
  KeyedUrl,
  Point,
  Pop,
  StarProps,
};
