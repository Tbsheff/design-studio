import type {
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
  RefObject,
} from "react";

import { copy } from "./copy.js";
import { Icon } from "./deps.js";

const PaletteSearch = ({
  inputRef,
  listId,
  activeId,
  query,
  isBusy,
  label,
  onChange,
  onKeyDown,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  listId: string;
  activeId: string;
  query: string;
  isBusy: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}): ReactElement => (
  <div className="cmdk-search">
    {isBusy && <span className="spinner" aria-hidden="true" />}
    {!isBusy && <Icon name="search" size={16} />}
    <input
      ref={inputRef}
      role="combobox"
      aria-expanded="true"
      aria-controls={listId}
      aria-activedescendant={activeId}
      aria-autocomplete="list"
      aria-label={label}
      placeholder={label}
      spellCheck={false}
      value={query}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
    <kbd className="cmdk-esc">{copy.textEsc}</kbd>
  </div>
);

export { PaletteSearch };
