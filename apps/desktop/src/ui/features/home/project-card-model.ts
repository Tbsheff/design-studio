import type { PackSummary, Project } from "@design-studio/contracts";
import { shortenHome } from "@design-studio/contracts/folders";
import type { ReactNode } from "react";

import { TYPE_LABELS, projectTypeOf } from "../../../shared/project-search.js";
import { copy } from "./copy.js";
import type { AppHealth, ProjectType } from "./deps.js";
import type { Point } from "./home-model.js";

interface CardActions {
  readonly onOpen: (project: Project) => void;
  readonly onRename: (project: Project, name: string) => Promise<void>;
  readonly onDuplicate: (project: Project) => void;
  readonly onReveal: (project: Project) => void;
  readonly onDelete: (project: Project) => void;
}

type CardAction = "open" | "rename" | "duplicate" | "reveal" | "delete";

type MenuAt = Point | "button" | "keys" | null;

interface ListFilter {
  readonly label: string;
  readonly onClear: () => void;
  readonly empty?: string;
}

type PackSwatches = (pack: PackSummary) => ReactNode;

interface ProjectBadge {
  readonly label: string;
  readonly tone: string;
}

const TYPE_TONE: Record<ProjectType, string> = {
  "design-system": "dsb",
  html: "proto",
  next: "next",
  react: "proto",
  vite: "vite",
};

const HEALTH_TEXT: Record<AppHealth["state"], string> = {
  building: "Building…",
  failed: "Failed",
  install: "Needs install",
  ready: "Ready",
  static: "Static",
};

const PRIVATE_PREFIX = /^\/private(?=\/)/u;

const isFolderProject = (project: Project): boolean =>
  Boolean(project.imported && !project.imported.created);

const toProjectBadge = (project: Project): ProjectBadge => {
  const type = projectTypeOf(project);

  if (type === "html" && isFolderProject(project)) {
    return { label: TYPE_LABELS[type], tone: "html" };
  }

  return { label: TYPE_LABELS[type], tone: TYPE_TONE[type] };
};

const toProjectPlace = (project: Project, homeDir: string | null): string => {
  if (isFolderProject(project) && project.imported) {
    return shortenHome(
      project.imported.sourcePath.replace(PRIVATE_PREFIX, ""),
      homeDir
    );
  }

  return "Design Studio";
};

const toFolderPlace = (
  project: Project,
  homeDir: string | null
): string | null => {
  if (isFolderProject(project)) {
    return toProjectPlace(project, homeDir);
  }

  return null;
};

const toClassName = (...parts: readonly (string | false)[]): string =>
  parts.filter(Boolean).join(" ");

type CardKeyIntent = "rename" | "menu" | "duplicate" | "delete" | null;

interface CardKey {
  readonly key: string;
  readonly hasMod: boolean;
  readonly isShift: boolean;
}

const toCardKeyIntent = ({ key, hasMod, isShift }: CardKey): CardKeyIntent => {
  if (key === "F2") {
    return "rename";
  }

  if (key === "ContextMenu" || (isShift && key === "F10")) {
    return "menu";
  }

  if (hasMod && key.toLowerCase() === "d") {
    return "duplicate";
  }

  if (hasMod && (key === "Backspace" || key === "Delete")) {
    return "delete";
  }

  return null;
};

const toFavoriteLabel = (name: string, isFavorite: boolean): string => {
  if (isFavorite) {
    return `Remove ${name} from favorites`;
  }

  return `Add ${name} to favorites`;
};

const toFavoriteTip = (isFavorite: boolean): string => {
  if (isFavorite) {
    return copy.removeFromFavorites;
  }

  return copy.addToFavorites;
};

const toTabIndex = (isActive: boolean): number => {
  if (isActive) {
    return 0;
  }

  return -1;
};

export {
  HEALTH_TEXT,
  isFolderProject,
  toCardKeyIntent,
  toClassName,
  toFavoriteLabel,
  toFavoriteTip,
  toFolderPlace,
  toProjectBadge,
  toProjectPlace,
  toTabIndex,
};

export type {
  CardAction,
  PackSwatches,
  CardKey,
  CardKeyIntent,
  CardActions,
  ListFilter,
  MenuAt,
  ProjectBadge,
};
