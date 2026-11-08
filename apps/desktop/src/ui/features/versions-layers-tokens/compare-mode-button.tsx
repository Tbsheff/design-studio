import { useCallback } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import type { Mode, ModeOption } from "./compare-mode-model.js";

interface ModeButtonProps {
  readonly index: number;
  readonly isOn: boolean;
  readonly onKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  readonly onMode: (mode: Mode) => void;
  readonly onRef: (index: number, node: HTMLButtonElement | null) => void;
  readonly option: ModeOption;
}

const ModeButton = ({
  index,
  isOn,
  onKey,
  onMode,
  onRef,
  option,
}: ModeButtonProps): ReactNode => {
  const handleRef = useCallback(
    (node: HTMLButtonElement | null): void => {
      onRef(index, node);
    },
    [index, onRef]
  );

  const handleSelect = useCallback((): void => {
    onMode(option.id);
  }, [onMode, option.id]);

  let tabIndex = -1;
  let className = "";

  if (isOn) {
    tabIndex = 0;
    className = "on";
  }

  return (
    <button
      type="button"
      ref={handleRef}
      aria-pressed={isOn}
      tabIndex={tabIndex}
      className={className}
      data-tip={option.tip}
      onClick={handleSelect}
      onKeyDown={onKey}
    >
      {option.label}
    </button>
  );
};

export { ModeButton };
