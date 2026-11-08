import type { CompiledTokenEntry } from "@design-studio/contracts";
import { useCallback } from "react";
import type { MouseEvent, ReactNode } from "react";

import { modeValue } from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { TokenOptionCheck } from "./token-option-check.js";
import { toPxNote } from "./token-picker-model.js";
import { TokenPreview } from "./token-preview.js";

interface OptionProps {
  readonly entry: CompiledTokenEntry;
  readonly id: string;
  readonly isActive: boolean;
  readonly isCurrent: boolean;
  readonly mode: TokenMode;
  readonly onChoose: (entry: CompiledTokenEntry) => void;
  readonly onHover: (position: number) => void;
  readonly position: number;
}

const toOptionClass = (isActive: boolean): string => {
  if (isActive) {
    return "tk-option active";
  }

  return "tk-option";
};

const handleMouseDown = (event: MouseEvent): void => {
  event.preventDefault();
};

const TokenPickerOption = (props: OptionProps): ReactNode => {
  const { entry, isActive, mode, onChoose, onHover, position } = props;

  const handleHover = useCallback((): void => {
    if (!isActive) {
      onHover(position);
    }
  }, [isActive, onHover, position]);

  const handleChoose = useCallback((): void => {
    onChoose(entry);
  }, [entry, onChoose]);

  return (
    <li>
      <button
        type="button"
        id={`${props.id}-${position}`}
        tabIndex={-1}
        aria-current={isActive}
        className={toOptionClass(isActive)}
        data-tip={modeValue(entry, mode)}
        data-tip-align="end"
        onMouseMove={handleHover}
        onMouseDown={handleMouseDown}
        onClick={handleChoose}
      >
        <TokenPreview entry={entry} mode={mode} />
        <span className="tk-name">{entry.cssVar}</span>
        <span className="tk-val">{toPxNote(entry, mode)}</span>
        <TokenOptionCheck isShown={props.isCurrent} />
      </button>
    </li>
  );
};

export { TokenPickerOption };
