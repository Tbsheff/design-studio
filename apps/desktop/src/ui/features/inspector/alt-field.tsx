import type { ReactElement } from "react";
import { useState } from "react";

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

  const commit = (): void => {
    if (text !== null && text !== initial) {
      onSave(text);
    }

    setText(null);
  };

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
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setText(null);
          }
        }}
      />
    </div>
  );
};

export { AltField };
