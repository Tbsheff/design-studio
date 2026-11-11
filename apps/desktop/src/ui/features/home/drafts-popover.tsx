import { useCallback } from "react";
import type { ReactElement, RefObject } from "react";

import { DRAFT_COUNTS, isDraftOff } from "../../domain/draft-counts.js";
import { copy } from "./copy.js";
import { DraftsOption } from "./drafts-option.js";
import type { DesignCount } from "./home-model.js";
import { Pop } from "./pop.js";
import type { Close } from "./pop.js";
import { moveFocusInMenu } from "./popover-focus-model.js";

interface DraftsPopoverProps {
  readonly trigger: RefObject<HTMLElement | null>;
  readonly onClose: Close;
  readonly designs: DesignCount;
  readonly isClosing: boolean;
}

const DraftsPopover = ({
  trigger,
  onClose,
  designs,
  isClosing,
}: DraftsPopoverProps): ReactElement => {
  const { max, onChange, value } = designs;

  const pick = useCallback(
    (count: number): void => {
      onChange(count);
      onClose(true);
    },
    [onChange, onClose]
  );

  return (
    <Pop
      trigger={trigger}
      closing={isClosing}
      onClose={onClose}
      variant="home-level-pop"
      label={copy.drafts}
      role="menu"
      onKeyDown={moveFocusInMenu}
    >
      <fieldset className="ui-menu-section" aria-label={copy.drafts}>
        <span className="ui-menu-label">{copy.drafts}</span>
        {DRAFT_COUNTS.map((count) => (
          <DraftsOption
            key={count}
            count={count}
            isChecked={count === value}
            isOff={isDraftOff(count, max, null)}
            onPick={pick}
          />
        ))}
      </fieldset>
    </Pop>
  );
};

export { DraftsPopover };

export type { DraftsPopoverProps };
