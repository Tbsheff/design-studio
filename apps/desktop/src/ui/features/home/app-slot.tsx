import type { ReactElement } from "react";

import type { AppSlotProps } from "./app-slot-model.js";
import { chipBlocker, chipName, chipProblem } from "./chip-logic-model.js";
import { copy } from "./copy.js";

const BADGE_TONE = {
  html: "html",
  next: "next",
  tokens: "html",
  vite: "vite",
} as const;

const toBadgeTone = (kind: keyof typeof BADGE_TONE): string => BADGE_TONE[kind];

const AppSlot = ({ chip, onDoctor }: AppSlotProps): ReactElement | null => {
  if (!chip) {
    return null;
  }

  const blocker = chipBlocker(chip);

  if (blocker) {
    let fix: string = copy.installDependencies;

    if (blocker.command !== null) {
      fix = blocker.command;
    }

    return (
      <button
        type="button"
        className="home-badge warn home-badge-btn"
        onClick={onDoctor}
      >
        {copy.fixTheAppFirst}
        {fix}
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
