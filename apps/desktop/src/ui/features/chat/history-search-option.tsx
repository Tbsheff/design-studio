import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";

const keepFocus = (event: MouseEvent): void => event.preventDefault();

const HistorySearchOption = ({
  isActive,
  prompt,
  onPick,
}: {
  isActive: boolean;
  prompt: string;
  onPick: (prompt: string) => void;
}): ReactElement => {
  const pick = useCallback(() => onPick(prompt), [onPick, prompt]);

  return (
    <li>
      <button
        type="button"
        aria-current={isActive}
        className={cn("skill-opt", isActive && "active")}
        onMouseDown={keepFocus}
        onClick={pick}
      >
        <span className="skill-opt-desc history-text">{prompt}</span>
      </button>
    </li>
  );
};

export { HistorySearchOption };
