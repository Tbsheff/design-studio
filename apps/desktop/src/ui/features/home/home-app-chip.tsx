import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";

import type { FolderInspection } from "../../../shared/open-app.js";
import { api, errorText } from "../../api.js";
import { desktopBridge } from "../../platform/desktop.js";

type RunMode = "start" | "url";

interface AppChip {
  readonly path: string;
  readonly inspection: FolderInspection | null;
  readonly isChecking: boolean;
  readonly error: string | null;
  readonly appDir: string | null;
  readonly mode: RunMode;
  readonly url: string;
  readonly env: string;
  readonly nonce: number;
}

const KIND_LABEL: Record<NonNullable<FolderInspection["kind"]>, string> = {
  html: "HTML",
  next: "Next.js",
  tokens: "Tokens",
  vite: "Vite",
};

const chipProblem = (chip: AppChip | null): string | null => {
  if (!chip || chip.isChecking) {
    return null;
  }

  return chip.error ?? chip.inspection?.problem ?? null;
};

const chipBlocker = (
  chip: AppChip | null
): { readonly command: string; readonly dir: string } | null => {
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

const chipName = (chip: AppChip): string =>
  chip.inspection?.name ??
  chip.path.split("/").filter(Boolean).pop() ??
  chip.path;

function chipLabel(chip: AppChip): string {
  if (chip.isChecking && !chip.inspection) {
    return "Checking…";
  }

  if (chipProblem(chip)) {
    return "Not an app folder";
  }

  const found = chip.inspection;

  if (!found?.kind) {
    return "";
  }

  const dir = chip.appDir ?? found.appDir;

  return dir && dir !== "."
    ? `${KIND_LABEL[found.kind]} · ${dir}`
    : KIND_LABEL[found.kind];
}

interface DropBridge {
  readonly pathForFile?: (file: File) => string;
}

const droppedFolder = (
  data: DataTransfer
): { readonly path: string } | { readonly unsupported: true } | null => {
  for (const item of data.items) {
    if (item.kind !== "file" || !item.webkitGetAsEntry()?.isDirectory) {
      continue;
    }

    const file = item.getAsFile();

    const path = file
      ? (desktopBridge<DropBridge>()?.pathForFile?.(file) ?? "")
      : "";

    return path ? { path } : { unsupported: true };
  }

  return null;
};

const useAppChip = () => {
  const [chip, setChip] = useState<AppChip | null>(null);

  const set = useCallback(
    (path: string) =>
      setChip({
        appDir: null,
        env: "",
        error: null,
        inspection: null,
        isChecking: true,
        mode: "start",
        nonce: 0,
        path,
        url: "",
      }),
    []
  );

  const clear = useCallback(() => setChip(null), []);

  const update = useCallback(
    (patch: Partial<AppChip>) =>
      setChip((current) => (current ? { ...current, ...patch } : current)),
    []
  );

  const path = chip?.path ?? null;
  const appDir = chip?.appDir ?? null;
  const nonce = chip?.nonce ?? 0;
  useEffect(() => {
    if (!path) {
      return;
    }

    let live = true;
    setChip((current) =>
      current ? { ...current, checking: true, error: null } : current
    );
    api
      .inspectFolder(path, appDir ?? undefined)
      .then(
        (inspection) =>
          live &&
          setChip((current) =>
            current?.path === path
              ? { ...current, checking: false, inspection }
              : current
          )
      )
      .catch(
        (error: unknown) =>
          live &&
          setChip((current) =>
            current?.path === path
              ? { ...current, error: errorText(error), checking: false }
              : current
          )
      );

    return (): void => {
      live = false;
    };
  }, [path, appDir, nonce]);

  return { chip, clear, set, update };
};

const AppChipView = ({
  chip,
  isMenuOpen,
  onMenu,
  onRemove,
}: {
  readonly chip: AppChip;
  readonly isMenuOpen: boolean;
  readonly onMenu: () => void;
  readonly onRemove: () => void;
}): ReactElement => {
  const name = chipName(chip);
  const bad = chipProblem(chip) !== null || chipBlocker(chip) !== null;

  return (
    <li className={`home-chip app${bad ? " warn" : ""}`}>
      <button
        type="button"
        className="home-chip-app"
        aria-haspopup="dialog"
        aria-expanded={isMenuOpen}
        aria-label={`App options for ${name}`}
        data-tip={chip.inspection?.path ?? chip.path}
        data-tip-align="start"
        onClick={onMenu}
      >
        <span className="home-chip-fi" aria-hidden="true">
          <Icon name="code" size={12} />
        </span>
        <b className="truncate">{name}</b>
        <span className="home-chip-host truncate">{chipLabel(chip)}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      <button
        type="button"
        className="home-chip-remove"
        aria-label={`Remove ${name}`}
        onClick={onRemove}
      >
        <Icon name="close" size={12} />
      </button>
    </li>
  );
};

export {
  AppChipView,
  chipBlocker,
  chipName,
  chipProblem,
  droppedFolder,
  useAppChip,
};

export type { AppChip, RunMode };
