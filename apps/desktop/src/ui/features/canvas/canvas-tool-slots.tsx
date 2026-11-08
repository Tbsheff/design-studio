import { Suspense, lazy } from "react";
import type { ComponentProps, ReactElement } from "react";

import type { InlinePromptView } from "../chat/use-inline-prompt.js";
import { CommentLayer } from "../comments/comment-layer.js";
import type { useCommentMode } from "../comments/use-comment-mode.js";
import type { Props } from "./canvas-types.js";
import { DrawSurface } from "./draw-layer.js";
import type { DrawTool } from "./use-draw-tool.js";
import {
  useVectorTool,
  useVectorToolGuards,
  useVectorToolKeys,
} from "./vector-tool-model.js";

const VectorLayer = lazy(async () => {
  const loaded = await import("./vector-layer.js");

  return { default: loaded.VectorLayer };
});

const InlinePrompt = lazy(() => import("../chat/inline-prompt.js"));

type CommentLayerProps = Parameters<typeof CommentLayer>[0];

const CanvasComments = (
  point: {
    comment: ReturnType<typeof useCommentMode>;
    control: Props["comments"];
    draw: DrawTool;
  } & Omit<CommentLayerProps, "control" | "commentMode" | "onExitCommentMode">
): ReactElement | null => {
  const { comment, control, draw, ...rest } = point;

  if (!comment.available || !control) {
    return null;
  }

  return (
    <>
      <CommentLayer
        {...rest}
        control={control}
        commentMode={comment.on}
        onExitCommentMode={() => comment.setOn(false)}
      />
      {draw.on && (
        <DrawSurface
          draw={draw}
          control={control}
          zoom={rest.zoom}
          frame={rest.frame}
          tools={rest.tools}
        />
      )}
    </>
  );
};

const useCanvasVectorTools = (
  editsEnabled: boolean,
  protoOn: boolean,
  draw: DrawTool,
  comment: { on: boolean; setOn: (on: boolean) => void }
): void => {
  const { tool } = useVectorTool();
  useVectorToolKeys(editsEnabled && !protoOn);
  useVectorToolGuards(tool, draw.on || comment.on, () => {
    draw.setOn(false);
    comment.setOn(false);
  });
};

const VectorSlot = (
  pointValue: Omit<ComponentProps<typeof VectorLayer>, "directionId"> & {
    directionId: string | null;
  }
): ReactElement | null => {
  const { available } = useVectorTool();
  const { directionId } = pointValue;

  if (!available || !directionId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <VectorLayer {...pointValue} directionId={directionId} />
    </Suspense>
  );
};

const InlinePromptSlot = ({
  view,
  zoom,
  frame,
}: {
  view: InlinePromptView | null;
  zoom: number;
  frame: { width: number; height: number };
}): ReactElement | null => {
  if (!view) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <InlinePrompt view={view} zoom={zoom} frame={frame} />
    </Suspense>
  );
};

export { CanvasComments, InlinePromptSlot, VectorSlot, useCanvasVectorTools };
