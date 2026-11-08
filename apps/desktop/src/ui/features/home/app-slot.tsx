import { Icon } from "@design-studio/ui";
import type { RefObject, ReactElement } from "react";

import { copy } from "./copy.js";
import { chipBlocker, chipName, chipProblem } from "./home-app-chip.js";
import type { AppChip } from "./home-app-chip.js";
import type { Pop } from "./home-model.js";
import { loadAppMenu } from "./lazy-parts.js";

interface AppSlotProps {
  readonly chip: AppChip | null;
  readonly pop: Pop;
  readonly folderRef: RefObject<HTMLButtonElement | null>;
  readonly onAddFolder: () => void;
  readonly onDoctor: () => void;
}

const AppSlot = ({
  chip,
  pop,
  folderRef,
  onAddFolder,
  onDoctor,
}: AppSlotProps): ReactElement | null => {
  if (!chip) {
    return (
      <button
        ref={folderRef}
        type="button"
        className="home-pill"
        aria-haspopup="dialog"
        aria-expanded={pop === "folder"}
        data-tip={copy.addAppFolder}
        data-tip-side="top"
        onPointerEnter={() => void loadAppMenu()}
        onClick={onAddFolder}
      >
        <Icon name="folder" size={14} />
        <span className="home-pill-text">Add app folder</span>
      </button>
    );
  }

  const blocker = chipBlocker(chip);

  if (blocker) {
    return (
      <button
        type="button"
        className="home-badge warn home-badge-btn"
        onClick={onDoctor}
      >
        Fix the app first: {blocker.command}
      </button>
    );
  }

  if (!chip.inspection?.kind || chipProblem(chip)) {
    return null;
  }

  return (
    <span
      className={`home-badge ${chip.inspection.kind === "next" ? "next" : chip.inspection.kind === "vite" ? "vite" : "html"}`}
    >
      Edits {chipName(chip)}
    </span>
  );
};

export { AppSlot };

export type { AppSlotProps };
