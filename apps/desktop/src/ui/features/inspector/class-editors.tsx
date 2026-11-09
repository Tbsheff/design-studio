import type { ReactElement } from "react";

import { ClassSuggestMenu } from "./class-suggest-menu.js";
import { copy } from "./copy.js";
import { PADDING } from "./props-model.js";
import type { ClassBody } from "./props-model.js";
import { PxField } from "./px-field.js";
import { useClassSuggest } from "./use-class-suggest.js";

interface ClassEditorsProps {
  readonly directionId: string;
  readonly onSend: (body: ClassBody) => void;
  readonly projectId: string;
}

const ClassEditors = ({
  directionId,
  onSend,
  projectId,
}: ClassEditorsProps): ReactElement => {
  const { active, isOpen, rows, typed, ...handlers } = useClassSuggest({
    directionId,
    onSend,
    projectId,
  });

  const { onBlur, onChange, onFocus, onKeyDown, onPick } = handlers;

  return (
    <>
      <div className="ins-grid">
        {PADDING.map((field) => (
          <PxField key={field.label} field={field} onSend={onSend} />
        ))}
      </div>
      <div className="ins-field wide cls-suggest-host">
        <input
          className="ins-input mono"
          aria-label={copy.addClass}
          placeholder={copy.addClassForExamplePx}
          value={typed}
          spellCheck={false}
          onBlur={onBlur}
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
        />
        {isOpen && (
          <ClassSuggestMenu active={active} rows={rows} onPick={onPick} />
        )}
      </div>
    </>
  );
};

export { ClassEditors };
