import type { CompiledTokenEntry } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import type { TokenMode } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";
import { TokenPickerOption } from "./token-picker-option.js";
import { useTokenPicker } from "./use-token-picker.js";

const SEARCH_SIZE = 13;

interface PickerProps {
  label: string;
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  current: string | null;
  nearest: string | null;
  onChoose: (entry: CompiledTokenEntry) => void;
}

const TokenPicker = (props: PickerProps): ReactNode => {
  const { current, label, mode, onChoose } = props;
  const picker = useTokenPicker(props);
  const { bindInput, bindList, id, index, list } = picker;

  return (
    <div className="tk-picker">
      <div className="tk-search">
        <Icon name="search" size={SEARCH_SIZE} />
        <input
          ref={bindInput}
          aria-label={`${COPY.pickerSearchPrefix}${label.toLowerCase()}${COPY.pickerTokensSuffix}`}
          aria-controls={`${id}-list`}
          placeholder={COPY.placeholderSearchTokens}
          value={picker.query}
          spellCheck={false}
          autoComplete="off"
          onChange={picker.handleSearchChange}
          onKeyDown={picker.handleSearchKeyDown}
        />
      </div>
      <ul
        ref={bindList}
        className="tk-list"
        id={`${id}-list`}
        aria-label={`${label}${COPY.pickerTokensSuffix}`}
      >
        {list.map((entry, position) => (
          <TokenPickerOption
            key={entry.cssVar}
            entry={entry}
            id={id}
            isActive={position === index}
            isCurrent={entry.cssVar === current}
            mode={mode}
            onChoose={onChoose}
            onHover={picker.handleHover}
            position={position}
          />
        ))}
        {list.length === 0 && (
          <li className="tk-empty">{COPY.pickerNoMatch}</li>
        )}
      </ul>
    </div>
  );
};

export { TokenPicker };
