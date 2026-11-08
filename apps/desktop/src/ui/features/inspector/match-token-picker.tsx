import type { StyleValueRow } from "@design-studio/contracts/style-search";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { shownValue, Swatch } from "./match-candidates.js";
import type { Candidate } from "./match-candidates.js";
import { PICK_SHOWN, KIND_EXAMPLE } from "./match-scan.js";

const TokenPicker = (props: {
  readonly row: StyleValueRow;
  readonly candidates: Candidate[];
  readonly target: string;
  readonly onPick: (token: string) => void;
  readonly onClose: () => void;
}): ReactElement => {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.closest(".sm-picker")?.scrollIntoView({ block: "nearest" });
  }, []);
  const filter = text.trim().toLowerCase();

  const shown = props.candidates
    .filter(
      (candidateValue) =>
        !filter ||
        candidateValue.token.toLowerCase().includes(filter) ||
        candidateValue.hint.toLowerCase().includes(filter)
    )
    .slice(0, PICK_SHOWN);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      props.onClose();
    } else if (event.key === "Enter" && text.trim()) {
      event.preventDefault();
      props.onPick(
        shown[0]?.token.toLowerCase() === filter
          ? (shown[0]?.token ?? text.trim())
          : text.trim()
      );
    }
  };

  return (
    <div
      className="sm-picker"
      role="group"
      aria-label={`Replace ${shownValue(props.row)} with a token`}
    >
      <p className="sm-picker-head">
        {copy.replace}
        <code>{shownValue(props.row)}</code> {copy.on}
        {props.target}
      </p>
      <input
        ref={input}
        className="ins-input sm-picker-input"
        aria-label={copy.tokenOrClass}
        placeholder={KIND_EXAMPLE[props.row.kind]}
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={(changeEvent) => setText(changeEvent.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="sm-picker-list" role="listbox" aria-label={copy.tokens}>
        {shown.map((candidate) => (
          <button
            key={candidate.token}
            type="button"
            role="option"
            aria-selected="false"
            className="ui-menu-item sm-pick"
            onClick={() => props.onPick(candidate.token)}
          >
            <Swatch kind={props.row.kind} value={candidate.value} />
            <code className="sm-pick-token">{candidate.token}</code>
            <span className="ui-menu-meta">
              {candidate.hint ||
                shownValue({ kind: props.row.kind, value: candidate.value })}
            </span>
          </button>
        ))}
        {shown.length === 0 && (
          <p className="sm-empty">{copy.typeACssVariableOr}</p>
        )}
      </div>
      <div className="sm-picker-actions">
        <button
          type="button"
          className="btn ghost small"
          onClick={props.onClose}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          className="btn small"
          disabled={!text.trim()}
          onClick={() => props.onPick(text.trim())}
        >
          {copy.replace2}
        </button>
      </div>
    </div>
  );
};

export { TokenPicker };
