import type { ReactElement } from "react";

import type { ComposerProps } from "./comment-composer-model.js";
import { ComposerCard } from "./composer-card.js";
import { ComposerPin } from "./composer-pin.js";
import { useCommentComposer } from "./use-comment-composer.js";

const CommentComposer = (props: ComposerProps): ReactElement => {
  const composer = useCommentComposer(props);

  return (
    <>
      <ComposerPin
        initial={props.initial}
        placement={composer.placement}
        scale={composer.scale}
        isClosing={composer.isClosing}
      />
      <ComposerCard config={props} composer={composer} />
    </>
  );
};

export { CommentComposer };

export type {
  ComposerSources,
  ComposerSubmit,
} from "./comment-composer-model.js";
