import { useCallback } from "react";
import type { ReactElement } from "react";

import { CommentLayer } from "../comments/comment-layer.js";
import type { useCommentMode } from "../comments/use-comment-mode.js";
import type { Props } from "./canvas-types.js";
import { DrawSurface } from "./draw-layer.js";
import type { DrawTool } from "./use-draw-tool.js";

type CommentLayerProps = Parameters<typeof CommentLayer>[0];

const CanvasComments = ({
  comment,
  control,
  draw,
  frames,
  kind,
  zoom,
  frame,
  selectMode,
  editing,
  selection,
  tools,
  activeFrame,
}: {
  comment: ReturnType<typeof useCommentMode>;
  control: Props["comments"];
  draw: DrawTool;
} & Omit<
  CommentLayerProps,
  "control" | "commentMode" | "isFrameReady" | "onExitCommentMode"
>): ReactElement | null => {
  const { setOn } = comment;

  const exitCommentMode = useCallback(() => setOn(false), [setOn]);

  if (!comment.available || !control) {
    return null;
  }

  return (
    <>
      <CommentLayer
        control={control}
        frames={frames}
        kind={kind}
        zoom={zoom}
        frame={frame}
        commentMode={comment.on}
        isFrameReady={false}
        selectMode={selectMode}
        editing={editing}
        selection={selection}
        onExitCommentMode={exitCommentMode}
        tools={tools}
        activeFrame={activeFrame}
      />
      {draw.on && (
        <DrawSurface
          draw={draw}
          control={control}
          zoom={zoom}
          frame={frame}
          tools={tools}
        />
      )}
    </>
  );
};

export { CanvasComments };
