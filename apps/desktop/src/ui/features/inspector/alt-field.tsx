import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";
import { useCallback, useState } from "react";

import { copy } from "./copy.js";

const AltField = ({
  initial,
  isDisabled: disabled,
  onSave,
}: {
  readonly initial: string;
  readonly isDisabled: boolean;
  readonly onSave: (alt: string) => void;
}): ReactElement => {
  const [text, setText] = useState<string | null>(null);

  const commit = useCallback((): void => {
    if (text !== null && text !== initial) {
      onSave(text);
    }

    setText(null);
  }, [text, initial, onSave]);

  const handleTextEdit = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setText(event.target.value),
    []
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commit();
      }

      if (event.key === "Escape") {
        setText(null);
      }
    },
    [commit]
  );

  return (
    <div className="ins-field wide">
      <label htmlFor="img-alt" className="ins-scrub static">
        {copy.alt}
      </label>
      <input
        id="img-alt"
        className="ins-input"
        aria-label={copy.altText}
        value={text ?? initial}
        placeholder={copy.describeTheImage}
        disabled={disabled}
        spellCheck
        onChange={handleTextEdit}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export { AltField };
