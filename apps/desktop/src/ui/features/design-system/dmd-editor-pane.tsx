import type {
  ChangeEvent,
  KeyboardEvent,
  ReactElement,
  RefObject,
} from "react";
import { useCallback } from "react";

import { COPY } from "./copy.js";

const DmdEditorPane = ({
  content,
  editorRef,
  onChange,
  onSave,
}: {
  content: string | null;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onSave: () => void;
}): ReactElement => {
  const changeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      onChange(event.target.value),
    [onChange]
  );

  const saveOnShortcut = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onSave();
      }
    },
    [onSave]
  );

  return (
    <div className="dmd-pane">
      <p className="dmd-pane-label">{COPY.textMarkdown}</p>
      <textarea
        ref={editorRef}
        className="mono design-md"
        aria-label={COPY.labelDesignMdContent}
        value={content ?? ""}
        disabled={content === null}
        onChange={changeText}
        onKeyDown={saveOnShortcut}
        placeholder={COPY.placeholderDesignMd}
        spellCheck={false}
      />
    </div>
  );
};

export { DmdEditorPane };
