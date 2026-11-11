import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import type { DraftChip as DraftChipState } from "./draft-bar-model.js";

interface DraftChipProps {
  readonly chip: DraftChipState;
  readonly chipRef: RefObject<HTMLButtonElement | null>;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly popId: string;
}

const DraftChip = ({
  chip,
  chipRef,
  isOpen,
  onToggle,
  popId,
}: DraftChipProps): ReactElement => (
  <button
    ref={chipRef}
    type="button"
    className={`draft-chip draft-check ${chip.tone}`}
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    aria-controls={popId}
    data-tip={copy.draftDetails}
    data-tip-align="start"
    onClick={onToggle}
  >
    <span className="draft-chip-dot" aria-hidden="true" />
    {chip.text}
  </button>
);

export { DraftChip };
