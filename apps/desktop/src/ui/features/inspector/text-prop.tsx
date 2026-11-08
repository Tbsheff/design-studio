import type { PropSpec, PropValue } from "@design-studio/contracts/props";
import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { toDraftText } from "./props-model.js";

interface TextPropProps {
  readonly spec: PropSpec;
  readonly value: PropValue | null;
  readonly isDisabled: boolean;
  readonly onChange: (value: PropValue | null) => void;
}

const toInputType = (spec: PropSpec): "number" | "text" => {
  if (spec.control === "number") {
    return "number";
  }

  return "text";
};

const toPlaceholder = (spec: PropSpec): string => {
  if (spec.node) {
    return "Text";
  }

  return "";
};

const toCommitted = (spec: PropSpec, next: string): PropValue | null => {
  if (next.trim() === "") {
    return null;
  }

  if (spec.control === "number") {
    return Number(next);
  }

  return next;
};

const TextProp = ({
  spec,
  value,
  isDisabled,
  onChange,
}: TextPropProps): ReactElement => {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? toDraftText(value);

  const commit = useCallback(() => {
    if (draft === null) {
      return;
    }

    setDraft(null);

    if (draft === toDraftText(value)) {
      return;
    }

    onChange(toCommitted(spec, draft));
  }, [draft, value, spec, onChange]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commit();
      }

      if (event.key === "Escape") {
        event.stopPropagation();
        setDraft(null);
      }
    },
    [commit]
  );

  const onDraft = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    []
  );

  return (
    <div className="ins-field wide prp-field">
      <label
        htmlFor={`prp-${spec.name}`}
        className="ins-scrub static prp-name"
        data-tip={spec.name}
      >
        {spec.name}
      </label>
      <input
        id={`prp-${spec.name}`}
        className="ins-input"
        aria-label={`${spec.name} prop`}
        type={toInputType(spec)}
        value={shown}
        placeholder={toPlaceholder(spec)}
        disabled={isDisabled}
        spellCheck={false}
        onChange={onDraft}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export { TextProp };
