import { useCallback, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { PADDING } from "./props-model.js";
import type { ClassBody } from "./props-model.js";
import { PxField } from "./px-field.js";

interface ClassEditorsProps {
  readonly onSend: (body: ClassBody) => void;
}

const ClassEditors = ({ onSend }: ClassEditorsProps): ReactElement => {
  const [adding, setAdding] = useState("");

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setAdding(event.target.value),
    []
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || adding.trim() === "") {
        return;
      }

      onSend({ classes: { add: adding.trim().split(/\s+/u) } });
      setAdding("");
    },
    [adding, onSend]
  );

  return (
    <>
      <div className="ins-grid">
        {PADDING.map((field) => (
          <PxField key={field.label} field={field} onSend={onSend} />
        ))}
      </div>
      <div className="ins-field wide">
        <input
          className="ins-input mono"
          aria-label={copy.addClass}
          placeholder={copy.addClassForExamplePx}
          value={adding}
          spellCheck={false}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      </div>
    </>
  );
};

export { ClassEditors };
