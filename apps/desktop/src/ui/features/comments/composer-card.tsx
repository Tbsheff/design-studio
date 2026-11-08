import { useMemo } from "react";
import type { PointerEvent, ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import type { ComposerProps } from "./comment-composer-model.js";
import { CARD_WIDTH } from "./comment-placement.js";
import { ComposerField } from "./composer-field.js";
import { ComposerFoot } from "./composer-foot.js";
import { toMentionListElement } from "./composer-mention-list.js";
import type { CommentComposerState } from "./use-comment-composer.js";

const stopPointer = (event: PointerEvent): void => event.stopPropagation();

const ComposerCard = ({
  config,
  composer,
}: {
  config: ComposerProps;
  composer: CommentComposerState;
}): ReactElement => {
  const { card, draft, mentions, placement, scale } = composer;
  const { onCardKey } = composer;
  const { pick } = mentions;
  const { changeToClaude } = draft;
  const { submit } = composer;
  const { setActive } = mentions.picker;
  const { left, top } = placement.card;
  const crumbId = `${config.testId}-crumb`;

  const style = useMemo(
    () => ({ left, top, transform: `scale(${scale})`, width: CARD_WIDTH }),
    [left, scale, top]
  );

  return (
    <dialog
      open
      ref={card}
      className={toChoice(
        composer.isClosing,
        "comment-card closing",
        "comment-card"
      )}
      aria-label={config.label}
      aria-describedby={crumbId}
      data-testid={config.testId}
      data-side={placement.side}
      style={style}
      onKeyDown={onCardKey}
      onPointerDown={stopPointer}
    >
      <p
        className="comment-card-crumb"
        id={crumbId}
        data-tip={config.breadcrumb.full}
        data-tip-align="start"
      >
        {config.breadcrumb.short}
      </p>
      <ComposerField composer={composer} label={config.label} />
      {mentions.picker.open &&
        toMentionListElement({
          current: mentions.picker.current,
          loading: mentions.loading,
          onHover: setActive,
          onPick: pick,
          shown: mentions.picker.shown,
        })}
      <ComposerFoot
        toClaude={draft.toClaude}
        onToClaude={changeToClaude}
        isBlocked={composer.isBlocked}
        isSubmitting={composer.isSubmitting}
        onSubmit={submit}
        hint={composer.hint}
      />
    </dialog>
  );
};

export { ComposerCard };
