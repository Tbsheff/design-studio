import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import type { ClassBody, PaddingField } from "./props-model.js";
import { toPaddingStyle } from "./props-model.js";

interface PxFieldProps {
  readonly field: PaddingField;
  readonly onSend: (body: ClassBody) => void;
}

const PxField = ({ field, onSend }: PxFieldProps): ReactElement => {
  const [text, setText] = useState("");

  const commit = useCallback(() => {
    const trimmed = text.trim();

    if (trimmed === "") {
      return;
    }

    const px = Number(trimmed.replace(/px$/u, ""));

    if (Number.isFinite(px) && px >= 0) {
      onSend({ style: toPaddingStyle(field, px) });
    }

    setText("");
  }, [text, field, onSend]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setText(event.target.value),
    []
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commit();
      }
    },
    [commit]
  );

  return (
    <div className="ins-field">
      <span className="ins-scrub static">{field.axis}</span>
      <input
        className="ins-input"
        aria-label={field.label}
        placeholder={field.label}
        value={text}
        inputMode="numeric"
        onChange={onChange}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export { PxField };
