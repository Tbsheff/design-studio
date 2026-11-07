import type {
  Project,
  ProjectKind,
  ProjectSettings,
  RunLevel,
} from "@design-studio/contracts";
import {
  type WorkspaceList,
  shortenHome,
} from "@design-studio/contracts/folders";
import type { DragEvent } from "react";

import { api } from "../../api.js";
import { homeVariations } from "../../platform/storage.js";
import { modelLabel } from "../chat/settings-draft-model.js";
import { type AppChip, chipName, chipProblem } from "./home-app-chip.js";
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
  wireframe: "Wireframe",
  prototype: "Prototype",
  polish: "Polish",
};

const PLACEHOLDER =
  "Describe what to design. Drop an app folder, an image or a link to build on it.";

const HOME_REASON_ID = "home-send-reason";

const EMPTY_PROMPT = "Describe the design first";

function focusPrompt(home: HTMLElement | null, atEnd = false): void {
  home?.scrollTo({ top: 0, behavior: "smooth" });
  window.requestAnimationFrame(() => {
    const area = document.querySelector<HTMLTextAreaElement>(
      '[aria-label="Describe the design"]'
    );

    area?.focus();

    if (atEnd && area) {
      area.setSelectionRange(area.value.length, area.value.length);
    }
  });
}

function focusIn(selector: string): void {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(selector);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus();
  }, 60);
}

function folderLabel(
  list: WorkspaceList | null,
  location: string | null
): string {
  const folders = list?.folders ?? [];

  const match =
    folders.find((folder) => folder.path === location) ??
    folders.find((folder) => folder.default);

  return match?.label ?? "Design Studio";
}

function modelSummary(model: string, count: number): string {
  const extra = count > 1 ? ` · ${count}×` : "";

  return `${modelLabel(model).replace(/^Claude /u, "")}${extra}`;
}

function homeSendBlocker(
  busy: Busy,
  prompt: string,
  asking: boolean,
  chip: AppChip | null
): string | null {
  if (busy !== null) {
    return "Working on it";
  }

  if (chip) {
    return chip.checking ? "Checking the folder" : chipProblem(chip);
  }

  if (asking) {
    return "Answer or skip the questions below";
  }

  if (!prompt.trim()) {
    return EMPTY_PROMPT;
  }

  return null;
}

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

async function createFromHome(input: HomeCreateInput): Promise<Project> {
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
    prompt: input.prompt,
    kind: input.kind,
    settings: input.settings,
    level,
    ...extra,
    ...where,
    ...(fanOut || separateRun ? { startRun: false } : {}),
    ...refs,
  });

  if (fanOut) {
    homeVariations.set({
      projectId: project.id,
      prompt: input.prompt,
      count: input.designCount,
      level,
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
      prompt: input.prompt,
      mode: "edit",
      level,
      attachmentIds: uploaded.map((item) => item.id),
      ...refs,
    });
  }

  return project;
}

function hasFiles(event: DragEvent): boolean {
  return [...event.dataTransfer.types].includes("Files");
}

function promptPlaceholder(
  chip: AppChip | null,
  empty: boolean
): string | null {
  if (chip) {
    return `Describe a change to ${chipName(chip)}, or press Return to open it`;
  }

  return empty ? PLACEHOLDER : null;
}

function reasonId(blocker: string | null): string | undefined {
  return blocker && blocker !== EMPTY_PROMPT ? HOME_REASON_ID : undefined;
}

function isEmpty(projects: Project[] | null): boolean {
  return (
    projects !== null &&
    projects.filter((project) => !project.designSystemDeleted).length === 0
  );
}

function homeOf(workspaces: WorkspaceList | null): string | null {
  return workspaces?.homeDir ?? null;
}

function shortHome(target: string, homeDir: string | null): string {
  return shortenHome(target.replace(/^\/private(?=\/)/u, ""), homeDir);
}

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
  readonly on: boolean;
}

interface KeyedUrl {
  readonly key: string;
  readonly url: string;
}

interface StarProps {
  readonly filled: boolean;
  readonly size?: number;
}

export {
  PLACEHOLDER,
  focusPrompt,
  EXAMPLE_MS,
  reasonId,
  LEVEL_LABEL,
  shortHome,
  folderLabel,
  hasFiles,
  homeSendBlocker,
  promptPlaceholder,
  homeOf,
  modelSummary,
  EXAMPLES,
  EMPTY_PROMPT,
  isEmpty,
  focusIn,
  HOME_REASON_ID,
  createFromHome,
};

export type {
  Pop,
  Busy,
  HomeCreateInput,
  DesignCount,
  KeyedFlag,
  KeyedUrl,
  Point,
  StarProps,
};
