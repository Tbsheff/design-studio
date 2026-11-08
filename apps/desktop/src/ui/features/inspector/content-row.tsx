import type { SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { textEditability } from "./css-values.js";
import { DataTextNote, useInspectorApp } from "./inspector-shared.js";
import { toReadonlyText } from "./rows-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useRowKeys } from "./use-row-keys.js";

interface ContentRowProps {
  readonly selection: SelectionContext;
  readonly edit: DirectEdit;
}

const ContentRow = ({ selection, edit }: ContentRowProps): ReactElement => {
  const state = textEditability(selection);
  const handleKeyDown = useRowKeys(edit.commit, edit.revertText);
  const data = useInspectorApp().element?.textFromData;
  const { previewText, commit: handleTextSettle } = edit;

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => previewText(event.target.value),
    [previewText]
  );

  if (data) {
    return <DataTextNote data={data} selection={selection} edit={edit} />;
  }

  if (state !== "ok") {
    return (
      <div className="ins-field wide readonly">
        <span className="ins-scrub static">{copy.content}</span>
        <span className="ins-value">{toReadonlyText(state)}</span>
      </div>
    );
  }

  return (
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
        data-tip={edit.text}
        onChange={handleTextChange}
        onBlur={handleTextSettle}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export { ContentRow };
