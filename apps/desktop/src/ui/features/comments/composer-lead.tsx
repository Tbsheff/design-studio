import { useCallback } from "react";
import type { ReactElement } from "react";

import { Pill } from "./composer-pill.js";
import { Thumb } from "./composer-thumb.js";
import { copy } from "./copy.js";
import { mentionIcon, mentionKey, mentionLabel, mentionTitle } from "./deps.js";
import type { CommentComposerState } from "./use-comment-composer.js";

const ComposerLead = ({
  composer,
}: {
  composer: CommentComposerState;
}): ReactElement => {
  const { draft, images, leadRef, mentions } = composer;
  const { changeToClaude, toClaude } = draft;
  const { remove: removeMention } = mentions;
  const { remove: removeImage } = images;

  const dropClaude = useCallback(
    (): void => changeToClaude(false),
    [changeToClaude]
  );

  return (
    <span ref={leadRef} className="comment-lead">
      {toClaude && (
        <Pill
          icon={null}
          label={copy.textAtClaude}
          tone="claude"
          tip={copy.tipGoesToClaude}
          value=""
          onRemove={dropClaude}
        />
      )}
      {mentions.mentions.map((mention) => (
        <Pill
          key={mentionKey(mention)}
          icon={mentionIcon(mention)}
          label={mentionLabel(mention)}
          tone=""
          tip={mentionTitle(mention)}
          value={mentionKey(mention)}
          onRemove={removeMention}
        />
      ))}
      {images.images.map((image) => (
        <Thumb key={image.key} image={image} onRemove={removeImage} />
      ))}
    </span>
  );
};

export { ComposerLead };
