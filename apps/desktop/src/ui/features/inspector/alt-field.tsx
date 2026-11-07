import { useState } from "react";

const AltField = ({
  initial,
  disabled,
  onSave,
}: {
  readonly initial: string;
  readonly disabled: boolean;
  readonly onSave: (alt: string) => void;
}) => {
  const [text, setText] = useState<string | null>(null);

  const commit = () => {
    if (text !== null && text !== initial) {
      onSave(text);
    }

    setText(null);
  };

  return (
    <div className="ins-field wide">
      <label htmlFor="img-alt" className="ins-scrub static">
        Alt
      </label>
      <input
        id="img-alt"
        className="ins-input"
        aria-label="Alt text"
        value={text ?? initial}
        placeholder="Describe the image"
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
