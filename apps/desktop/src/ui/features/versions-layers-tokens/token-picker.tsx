import type { CompiledTokenEntry } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import { modeValue } from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";
import { findElement } from "./find-element.js";
import {
  filterEntries,
  toMovedIndex,
  toPxNote,
  toStartIndex,
} from "./token-picker-model.js";
import { TokenPreview } from "./token-preview.js";

const SEARCH_SIZE = 13;
const CHECK_SIZE = 12;

interface PickerProps {
  label: string;
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  current: string | null;
  nearest: string | null;
  onChoose: (entry: CompiledTokenEntry) => void;
}

const toOptionClass = (isActive: boolean): string => {
  if (isActive) {
    return "tk-option active";
  }

  return "tk-option ";
};

const preventFocusLoss = (event: { preventDefault: () => void }): void => {
  event.preventDefault();
};

const toActiveId = (
  hasChosen: boolean,
  id: string,
  index: number
): string | undefined => {
  if (hasChosen) {
    return `${id}-${index}`;
  }
};

const TokenPicker = ({
  label,
  entries,
  mode,
  current,
  nearest,
  onChoose,
}: PickerProps): ReactNode => {
  const [query, setQuery] = useState("");
  const list = useMemo(() => filterEntries(entries, query), [entries, query]);

  const [active, setActive] = useState(() =>
    toStartIndex(entries, current, nearest)
  );

  const id = useId();
  const index = Math.min(active, Math.max(0, list.length - 1));
  const chosen = list[index];
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current) {
      findElement(listRef.current, `[id="${id}-${index}"]`)?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [id, index]);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      const next = toMovedIndex(event.key, index, list.length);

      if (next !== null) {
        event.preventDefault();
        setActive(next);
      } else if (event.key === "Enter" && chosen) {
        event.preventDefault();
        onChoose(chosen);
      }
    },
    [chosen, index, list.length, onChoose]
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setQuery(event.target.value);
      setActive(0);
    },
    []
  );

  return (
    <div className="tk-picker">
      <div className="tk-search">
        <Icon name="search" size={SEARCH_SIZE} />
        <input
          autoFocus
          aria-label={`${COPY.pickerSearchPrefix}${label.toLowerCase()}${COPY.pickerTokensSuffix}`}
          aria-controls={`${id}-list`}
          aria-activedescendant={toActiveId(Boolean(chosen), id, index)}
          role="combobox"
          aria-expanded="true"
          placeholder={COPY.placeholderSearchTokens}
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
      </div>
      <ul
        ref={listRef}
        className="tk-list"
        role="listbox"
        id={`${id}-list`}
        aria-label={`${label}${COPY.pickerTokensSuffix}`}
      >
        {list.map((entry, position) => (
          <li
            key={entry.cssVar}
            id={`${id}-${position}`}
            role="option"
            aria-selected={position === index}
            className={toOptionClass(position === index)}
            data-tip={modeValue(entry, mode)}
            data-tip-align="end"
            onMouseMove={() => position !== index && setActive(position)}
            onMouseDown={preventFocusLoss}
            onClick={() => onChoose(entry)}
          >
            <TokenPreview entry={entry} mode={mode} />
            <span className="tk-name">{entry.cssVar}</span>
            <span className="tk-val">{toPxNote(entry, mode)}</span>
            <span className="tk-check" aria-hidden="true">
              {entry.cssVar === current && (
                <Icon name="check" size={CHECK_SIZE} />
              )}
            </span>
          </li>
        ))}
        {list.length === 0 && (
          <li className="tk-empty">{COPY.pickerNoMatch}</li>
        )}
      </ul>
    </div>
  );
};

export { TokenPicker };
