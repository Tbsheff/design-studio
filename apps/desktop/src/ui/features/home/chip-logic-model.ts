import { desktopBridge } from "../../platform/desktop.js";
import type { AppChip } from "./app-chip-model.js";
import type { FolderInspection } from "./deps.js";

const KIND_LABEL: Record<NonNullable<FolderInspection["kind"]>, string> = {
  html: "HTML",
  next: "Next.js",
  tokens: "Tokens",
  vite: "Vite",
};

const FOLDER_LABEL = "Folder";

const getChipProblem = (chip: AppChip | null): string | null => {
  if (!chip || chip.isChecking) {
    return null;
  }

  return chip.error ?? chip.inspection?.problem ?? null;
};

const getChipBlocker = (
  chip: AppChip | null
): { readonly command: string | null; readonly dir: string } | null => {
  const found = chip?.inspection;

  if (
    !found ||
    found.problem ||
    found.depsInstalled !== false ||
    !found.install
  ) {
    return null;
  }

  if (found.kind === "next" && chip.mode === "url") {
    return null;
  }

  return found.install;
};

const getChipName = (chip: AppChip): string =>
  chip.inspection?.name ?? chip.path.split("/").findLast(Boolean) ?? chip.path;

const getChipLabel = (chip: AppChip): string => {
  if (chip.isChecking && !chip.inspection) {
    return "Checking…";
  }

  if (getChipProblem(chip)) {
    return "Not an app folder";
  }

  const found = chip.inspection;

  if (!found) {
    return "";
  }

  if (!found.kind) {
    return FOLDER_LABEL;
  }

  const dir = chip.appDir ?? found.appDir;

  if (dir && dir !== ".") {
    return `${KIND_LABEL[found.kind]} · ${dir}`;
  }

  return KIND_LABEL[found.kind];
};

interface DropBridge {
  readonly pathForFile: (file: File) => string;
}

const getDroppedPath = (item: DataTransferItem): string => {
  const file = item.getAsFile();

  if (!file) {
    return "";
  }

  return desktopBridge<Partial<DropBridge>>()?.pathForFile?.(file) ?? "";
};

const getDroppedFolder = (
  data: DataTransfer
): { readonly path: string } | { readonly unsupported: true } | null => {
  const item = [...data.items].find(
    (entry) => entry.kind === "file" && entry.webkitGetAsEntry()?.isDirectory
  );

  if (!item) {
    return null;
  }

  const path = getDroppedPath(item);

  if (path) {
    return { path };
  }

  return { unsupported: true };
};

export {
  getChipBlocker as chipBlocker,
  getChipLabel,
  getChipName as chipName,
  getChipProblem as chipProblem,
  getDroppedFolder as droppedFolder,
};
