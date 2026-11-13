import type { SharePlayData } from "@design-studio/contracts/share-play";
import { Icon } from "@design-studio/ui";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";
import { ShareCanvas } from "./share-canvas.js";
import { ShareComments } from "./share-comments.js";
import { ShareViewerHead } from "./share-viewer-head.js";
import type { SharePlayInput } from "./share-viewer-model.js";
import { useShareComments } from "./use-share-comments.js";
import { useShareViewer } from "./use-share-viewer.js";

interface ShareBodyProps {
  readonly renderPlay: (input: SharePlayInput) => ReactNode;
  readonly data: SharePlayData;
}

const ShareBody = ({ data, renderPlay }: ShareBodyProps): ReactElement => {
  const viewer = useShareViewer(data);
  const comments = useShareComments();
  const { draft, frames, isCommentsOpen, mode, play, selected } = viewer;
  const { onCanvas, onClearDraft, onComments, onPick, onPlay } = viewer;

  return (
    <div className="share-viewer">
      <ShareViewerHead
        title={data.title}
        isLive={data.isLive}
        isCommentsOpen={isCommentsOpen}
        onPlay={onPlay}
        onComments={onComments}
      />
      {mode === "canvas" && (
        <main className="share-main">
          <ShareCanvas
            comments={comments.comments}
            draft={draft}
            frames={frames}
            selected={selected}
            onPick={onPick}
          />
          {isCommentsOpen && (
            <ShareComments
              comments={comments}
              draft={draft}
              frames={frames}
              selected={Math.max(0, selected)}
              onClearDraft={onClearDraft}
            />
          )}
        </main>
      )}
      {mode === "play" && renderPlay(play)}
      {mode === "play" && (
        <button
          type="button"
          className="btn share-canvas-toggle"
          data-tip={copy.viewCanvasTip}
          data-testid="share-view-canvas"
          onClick={onCanvas}
        >
          <Icon name="frame" />
          {copy.viewCanvas}
        </button>
      )}
    </div>
  );
};

export { ShareBody };
