import type {
  Project,
  ProjectKind,
  ProjectSettings,
  RunLevel,
} from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import type { WorkspaceList } from "@design-studio/contracts/folders";
import type { DragEvent } from "react";

import { api } from "../../api.js";
import { homeVariations } from "../../platform/storage.js";
import { modelLabel } from "../chat/settings-draft-model.js";
import { chipName, chipProblem } from "./home-app-chip.js";
import type { AppChip } from "./home-app-chip.js";
import type { ImageDraft, ReferenceDraft } from "./home-composer-parts.js";

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

const setPromptFocus = (home: HTMLElement | null, atEnd = false): void => {
  home?.scrollTo({ behavior: "smooth", top: 0 });
  globalThis.requestAnimationFrame(() => {
    const area = document.querySelector<HTMLTextAreaElement>(
      '[aria-label="Describe the design"]'
    );

    area?.focus();

    if (atEnd && area) {
      area.setSelectionRange(area.value.length, area.value.length);
    }
  });
};

const setFocusIn = (selector: string): void => {
  globalThis.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  }, 60);
};

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
  const extra = count > 1 ? ` · ${count}×` : "";

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
    return chip.isChecking ? "Checking the folder" : chipProblem(chip);
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

const createFromHome = async (input: HomeCreateInput): Promise<Project> => {
  const extra = {
    ...(input.designMd.trim() ? { designMd: input.designMd } : {}),
    ...(input.packId ? { packId: input.packId } : {}),
  };

  const fanOut = input.designCount > 1;
  const level = input.settings.defaultLevel;
  const where = input.location ? { parentPath: input.location } : {};
  const referenceUrls = input.references.map((reference) => reference.url);
  const refs = referenceUrls.length > 0 ? { referenceUrls } : {};
  const separateRun = !fanOut && input.images.length > 0;

  const { project } = await api.createProject({
    kind: input.kind,
    level,
    prompt: input.prompt,
    settings: input.settings,
    ...extra,
    ...where,
    ...(fanOut || separateRun ? { startRun: false } : {}),
    ...refs,
  });

  if (fanOut) {
    homeVariations.set({
      count: input.designCount,
      level,
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

    await api.startRun(project.id, main.id, {
      attachmentIds: uploaded.map((item) => item.id),
      level,
      mode: "edit",
      prompt: input.prompt,
      ...refs,
    });
  }

  return project;
};

const hasFiles = (event: DragEvent): boolean =>
  [...event.dataTransfer.types].includes("Files");

const getPromptPlaceholder = (
  chip: AppChip | null,
  empty: boolean
): string | null => {
  if (chip) {
    return `Describe a change to ${chipName(chip)}, or press Return to open it`;
  }

  return empty ? PLACEHOLDER : null;
};

const getReasonId = (blocker: string | null): string | undefined =>
  blocker && blocker !== EMPTY_PROMPT ? HOME_REASON_ID : undefined;

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
  setFocusIn as focusIn,
  setPromptFocus as focusPrompt,
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
