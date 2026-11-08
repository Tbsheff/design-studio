import { useCallback, useMemo } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { TEXT_MAX, toTextIndent } from "./comment-composer-model.js";
import type { ComposerProps } from "./comment-composer-model.js";
import { ComposerLead } from "./composer-lead.js";
import { copy } from "./copy.js";
import type { CommentComposerState } from "./use-comment-composer.js";

const ComposerField = ({
  composer,
  label,
}: {
  composer: CommentComposerState;
  label: ComposerProps["label"];
}): ReactElement => {
  const { area, draft, focusField, leadBox, onAreaKey } = composer;
  const { changeText } = draft;
  const { onPaste } = composer.drop;

  const hasLead =
    draft.toClaude ||
    composer.mentions.mentions.length > 0 ||
    composer.images.images.length > 0;

  const areaStyle = useMemo(
    () => ({ textIndent: toTextIndent(leadBox.inline, leadBox.width) }),
    [leadBox.inline, leadBox.width]
  );

  const typeText = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void =>
      changeText(event.target.value),
    [changeText]
  );

  return (
    <div
      className={toChoice(
        leadBox.inline,
        "comment-field inline",
        "comment-field"
      )}
      onPointerDown={focusField}
    >
      {hasLead && <ComposerLead composer={composer} />}
      <textarea
        ref={area}
        className="comment-area"
        style={areaStyle}
        rows={1}
        aria-label={label}
        placeholder={copy.composer}
        value={draft.text}
        maxLength={TEXT_MAX}
        onChange={typeText}
        onKeyDown={onAreaKey}
        onPaste={onPaste}
      />
    </div>
  );
};

export { ComposerField };
