import type { TextSourceInfo } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { TextEditScope } from "./inspector-shared-model.js";
import { SourceTextNote } from "./source-text-note.js";

interface Props {
  readonly found: TextSourceInfo;
  readonly edit: TextEditScope;
}

const SourceTextRow = ({ found, edit }: Props): ReactElement => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
        event.preventDefault();
        edit.commit();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        edit.revertText();
      }
    },
    [edit]
  );

  const handleText = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      edit.previewText(event.target.value);
    },
    [edit]
  );

  const handleCommit = useCallback((): void => {
    edit.commit();
  }, [edit]);

  return (
    <>
      <div className="ins-field wide">
        <label htmlFor="ins-content" className="ins-scrub static">
          {copy.content}
        </label>
        <input
          id="ins-content"
          className="ins-input"
          aria-label={copy.textContent}
          value={edit.text}
          spellCheck={false}
          onChange={handleText}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
        />
      </div>
      <SourceTextNote found={found} />
    </>
  );
};

export { SourceTextRow };
