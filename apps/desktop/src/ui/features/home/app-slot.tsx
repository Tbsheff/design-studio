import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { AppSlotProps } from "./app-slot-model.js";
import { chipBlocker, chipName, chipProblem } from "./chip-logic-model.js";
import { copy } from "./copy.js";
import { loadAppMenu } from "./lazy-parts-model.js";

const BADGE_TONE = {
  html: "html",
  next: "next",
  tokens: "html",
  vite: "vite",
} as const;

const runAppMenuPreload = (): void => {
  loadAppMenu();
};

const toBadgeTone = (kind: keyof typeof BADGE_TONE): string => BADGE_TONE[kind];

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
        onPointerEnter={runAppMenuPreload}
        onClick={onAddFolder}
      >
        <Icon name="folder" size={14} />
        <span className="home-pill-text">{copy.addAppFolder}</span>
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
        {copy.fixTheAppFirst}
        {blocker.command}
      </button>
    );
  }

  if (!chip.inspection?.kind || chipProblem(chip)) {
    return null;
  }

  return (
    <span className={`home-badge ${toBadgeTone(chip.inspection.kind)}`}>
      {copy.edits}
      {chipName(chip)}
    </span>
  );
};

export { AppSlot };
