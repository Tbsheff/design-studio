import type { ShareViewerComment } from "@design-studio/contracts/share-play";
import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toFrameStyle, toFrameUrl, toSpotStyle } from "./share-viewer-model.js";
import type { PinSpot, ViewerFrame } from "./share-viewer-model.js";

interface ShareFrameViewProps {
  readonly frame: ViewerFrame;
  readonly index: number;
  readonly isSelected: boolean;
  readonly pins: readonly ShareViewerComment[];
  readonly draft: PinSpot | null;
  readonly wasDragged: () => boolean;
  readonly onPick: (spot: PinSpot) => void;
}

const FRAME_SANDBOX = "allow-scripts allow-same-origin allow-forms";

const toPinNode = (comment: ShareViewerComment): ReactElement | null => {
  if (comment.x === null || comment.y === null) {
    return null;
  }

  return (
    <span
      key={comment.n}
      className="share-pin"
      style={toSpotStyle({ x: comment.x, y: comment.y })}
    >
      {comment.n}
    </span>
  );
};

const toDraftNode = (
  draft: PinSpot | null,
  index: number
): ReactElement | null => {
  if (draft?.frame !== index) {
    return null;
  }

  return <span className="share-pin is-draft" style={toSpotStyle(draft)} />;
};

const toFrameClass = (isSelected: boolean): string => {
  if (isSelected) {
    return "share-frame is-selected";
  }

  return "share-frame";
};

const ShareFrameView = ({
  draft,
  frame,
  index,
  isSelected,
  onPick,
  pins,
  wasDragged,
}: ShareFrameViewProps): ReactElement => {
  const onClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      if (wasDragged()) {
        return;
      }

      const box = event.currentTarget.getBoundingClientRect();
      const ratio = frame.width / Math.max(1, box.width);

      onPick({
        frame: index,
        x: Math.round((event.clientX - box.left) * ratio),
        y: Math.round((event.clientY - box.top) * ratio),
      });
    },
    [frame.width, index, onPick, wasDragged]
  );

  return (
    <div
      className={toFrameClass(isSelected)}
      style={toFrameStyle(frame)}
      data-testid="share-frame"
    >
      <span className="share-frame-label">{frame.label}</span>
      <iframe
        className="share-frame-page"
        src={toFrameUrl(frame)}
        title={frame.label ?? copy.frameTitle}
        sandbox={FRAME_SANDBOX}
        width={frame.width}
        height={frame.height}
      />
      <button
        type="button"
        className="share-frame-hit"
        aria-label={frame.label ?? copy.frameTitle}
        onClick={onClick}
      />
      {pins.map((comment) => toPinNode(comment))}
      {toDraftNode(draft, index)}
    </div>
  );
};

export { ShareFrameView };
