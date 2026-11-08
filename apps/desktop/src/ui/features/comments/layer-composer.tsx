import type { ReactElement, RefObject } from "react";

import type { ComposerSubmit } from "./comment-composer-model.js";
import { CommentComposer } from "./comment-composer.js";
import type { FrameSize } from "./comment-layer-model.js";
import type { CommentTools } from "./comment-layer-types.js";
import type { Breadcrumb, PinOffset } from "./comment-placement.js";
import type { SelectionContext } from "./deps.js";
import type { CommentsControl } from "./use-comments.js";

interface LayerShared {
  readonly control: CommentsControl;
  readonly frame: FrameSize;
  readonly initial: string | null;
  readonly tools: CommentTools;
  readonly zoom: number;
}

interface LayerComposerProps {
  anchor: SelectionContext["rect"];
  shouldFocus: boolean;
  breadcrumb: Breadcrumb;
  draftKey: string;
  focusRef?: RefObject<HTMLTextAreaElement | null>;
  label: string;
  offset?: PinOffset;
  onCancel: () => void;
  onSubmit: (input: ComposerSubmit) => Promise<boolean>;
  shared: LayerShared;
  testId: string;
  trap: boolean;
}

const LayerComposer = ({
  anchor,
  shouldFocus,
  breadcrumb,
  draftKey,
  focusRef,
  label,
  offset,
  onCancel,
  onSubmit,
  shared,
  testId,
  trap,
}: LayerComposerProps): ReactElement => (
  <CommentComposer
    anchor={anchor}
    shouldFocus={shouldFocus}
    breadcrumb={breadcrumb}
    busy={shared.control.sending}
    draftKey={draftKey}
    focusRef={focusRef}
    frame={shared.frame}
    images
    initial={shared.initial}
    label={label}
    offset={offset}
    onCancel={onCancel}
    onSubmit={onSubmit}
    running={shared.control.running}
    sources={shared.tools.sources}
    steer={Boolean(shared.tools.onSteer)}
    testId={testId}
    trap={trap}
    zoom={shared.zoom}
  />
);

export { LayerComposer };

export type { LayerShared };
