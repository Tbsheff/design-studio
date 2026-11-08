import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { OPTION_ROLE } from "./aria-role-model.js";
import { MentionOptionHead } from "./mention-option-head.js";
import type { MentionOption } from "./mention-picker.js";

const keepFocus = (event: MouseEvent): void => event.preventDefault();

const MentionOptionRow = ({
  option,
  index,
  isCurrent,
  onHover,
  onPick,
}: {
  option: MentionOption;
  index: number;
  isCurrent: boolean;
  onHover: (index: number) => void;
  onPick: (option: MentionOption) => void;
}): ReactElement => {
  const hover = useCallback(() => onHover(index), [onHover, index]);
  const pick = useCallback(() => onPick(option), [onPick, option]);

  return (
    <li role="presentation">
      <button
        type="button"
        id={`mention-${option.key}`}
        role={OPTION_ROLE}
        aria-selected={isCurrent}
        className={cn("skill-opt mention-opt", isCurrent && "active")}
        onMouseDown={keepFocus}
        onMouseEnter={hover}
        onClick={pick}
      >
        <MentionOptionHead option={option} />
      </button>
    </li>
  );
};

export { MentionOptionRow };
