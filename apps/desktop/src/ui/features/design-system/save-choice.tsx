import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const SaveChoice = ({
  defaultName,
  isNew,
  isShown,
  onNew,
  onUpdate,
}: {
  defaultName: string;
  isNew: boolean;
  isShown: boolean;
  onNew: () => void;
  onUpdate: () => void;
}): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return (
    <fieldset className="save-choice">
      <legend className="sr-only">{COPY.textSaveAs}</legend>
      <label>
        <input
          type="radio"
          name="save-as"
          checked={!isNew}
          onChange={onUpdate}
        />
        {COPY.textUpdate}
        {defaultName}
      </label>
      <label>
        <input type="radio" name="save-as" checked={isNew} onChange={onNew} />
        {COPY.textSaveAsANew}
      </label>
    </fieldset>
  );
};

export { SaveChoice };
