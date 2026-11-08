import { useEffect, useRef } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { NOTE_MAX_LENGTH, NOTE_ROWS } from "./element-variants-model.js";

interface Props {
  readonly note: string;
  readonly onNote: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

const ElementVariantsNote = ({ note, onNote }: Props): ReactElement => {
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => noteRef.current?.focus(), []);

  return (
    <label className="element-variants-field">
      <span>{copy.whatToTryOptional}</span>
      <textarea
        ref={noteRef}
        rows={NOTE_ROWS}
        value={note}
        maxLength={NOTE_MAX_LENGTH}
        placeholder={copy.forExampleMoreCompactOr}
        onChange={onNote}
      />
    </label>
  );
};

export { ElementVariantsNote };
