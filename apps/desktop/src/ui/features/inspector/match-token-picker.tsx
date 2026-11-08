import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toShownValue } from "./match-candidates-model.js";
import type { Candidate } from "./match-candidates-model.js";
import { PickerList } from "./match-picker-list.js";
import { KIND_EXAMPLE } from "./match-scan-model.js";
import { useTokenPicker } from "./use-token-picker.js";

const TokenPicker = ({
  row,
  candidates,
  target,
  onPick,
  onClose,
}: {
  readonly row: StyleValueRow;
  readonly candidates: Candidate[];
  readonly target: string;
  readonly onPick: (token: string) => void;
  readonly onClose: () => void;
}): ReactElement => {
  const { change, inputRef, keyDown, rootRef, shown, submit, text } =
    useTokenPicker(candidates, onPick, onClose);

  return (
    <section
      ref={rootRef}
      className="sm-picker"
      aria-label={`Replace ${toShownValue(row)} with a token`}
    >
      <p className="sm-picker-head">
        {copy.replace}
        <code>{toShownValue(row)}</code> {copy.on}
        {target}
      </p>
      <input
        ref={inputRef}
        className="ins-input sm-picker-input"
        aria-label={copy.tokenOrClass}
        placeholder={KIND_EXAMPLE[row.kind]}
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={change}
        onKeyDown={keyDown}
      />
      <PickerList kind={row.kind} shown={shown} onPick={onPick} />
      <div className="sm-picker-actions">
        <button type="button" className="btn ghost small" onClick={onClose}>
          {copy.cancel}
        </button>
        <button
          type="button"
          className="btn small"
          disabled={!text.trim()}
          onClick={submit}
        >
          {copy.replace2}
        </button>
      </div>
    </section>
  );
};

export { TokenPicker };
