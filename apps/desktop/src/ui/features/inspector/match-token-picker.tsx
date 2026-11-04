import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import type { StyleValueRow } from "@design-studio/actions/_core/style-search";
import { shownValue, Swatch } from "./match-candidates.js";
import type { Candidate } from "./match-candidates.js";
import { PICK_SHOWN, KIND_EXAMPLE } from "./match-scan.js";

const TokenPicker = (props: {
  row: StyleValueRow;
  candidates: Candidate[];
  target: string;
  onPick: (token: string) => void;
  onClose: () => void;
}) => {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.closest(".sm-picker")?.scrollIntoView({ block: "nearest" });
  }, []);
  const filter = text.trim().toLowerCase();

  const shown = props.candidates
    .filter(
      (c) =>
        !filter ||
        c.token.toLowerCase().includes(filter) ||
        c.hint.toLowerCase().includes(filter)
    )
    .slice(0, PICK_SHOWN);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
        Replace <code>{shownValue(props.row)}</code> on {props.target}
      </p>
      <input
        ref={input}
        className="ins-input sm-picker-input"
        aria-label="Token or class"
        placeholder={KIND_EXAMPLE[props.row.kind]}
        value={text}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="sm-picker-list" role="listbox" aria-label="Tokens">
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
          <p className="sm-empty">
            Type a CSS variable or a Tailwind class, then press Return.
          </p>
        )}
      </div>
      <div className="sm-picker-actions">
        <button
          type="button"
          className="btn ghost small"
          onClick={props.onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn small"
          disabled={!text.trim()}
          onClick={() => props.onPick(text.trim())}
        >
          Replace
        </button>
      </div>
    </div>
  );
};

export { TokenPicker };
