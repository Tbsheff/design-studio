import type { PackSummary } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import { copy } from "./copy.js";
import { PackCards } from "./pack-cards.js";
import { Pop } from "./pop.js";
import type { Close } from "./pop.js";
import { moveFocusInItems } from "./popover-focus-model.js";

interface PackListState {
  readonly packs: PackSummary[] | null;
  readonly error: string | null;
}

interface PackPopoverProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly state: PackListState;
  readonly value: string | null;
  readonly onChange: (id: string | null) => void;
  readonly onNew: () => void;
  readonly isClosing: boolean;
}

const NO_PACKS: PackSummary[] = [];

const PackPopover = ({
  trigger,
  onClose,
  state,
  value,
  onChange,
  onNew,
  isClosing,
}: PackPopoverProps): ReactElement => {
  const pick = useCallback(
    (pack: PackSummary | null): void => {
      onChange(pack?.id ?? null);
      onClose(true);
    },
    [onChange, onClose]
  );

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      variant="home-pack-pop"
      label="Design system"
      onKeyDown={moveFocusInItems}
    >
      <p className="home-pop-lede">{copy.setUpADesignSystem}</p>
      <button type="button" className="btn strong home-pop-cta" onClick={onNew}>
        {copy.setUpYourDesignSystem}
      </button>
      {state.error && (
        <div className="alert error small">
          {copy.couldNotLoadDesignSystems}
          {state.error}
        </div>
      )}
      <PackCards
        packs={state.packs ?? NO_PACKS}
        value={value}
        shouldIncludeNone
        onPick={pick}
      />
    </Pop>
  );
};

export { PackPopover };

export type { PackPopoverProps };
