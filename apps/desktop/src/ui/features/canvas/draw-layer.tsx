import type { CommentDrawing } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { strokesBox } from "../../../shared/comments.js";
import { CommentComposer } from "../comments/comment-composer.js";
import type { ComposerSubmit } from "../comments/comment-composer.js";
import type { CommentTools } from "../comments/comment-layer.js";
import type { CommentsControl } from "../comments/use-comments.js";
import { useProfileInitial } from "../home/use-profile-initial.js";
import { copy } from "./copy.js";
import type { DrawFrame } from "./draw-frame-model.js";
import { renderDrawingPng } from "./drawing-model.js";
import { DrawingStrokes } from "./drawing-strokes.js";
import { PenIcon } from "./pen-icon.js";
import { toValueOr } from "./settle-model.js";
import { useDrawSurface } from "./use-draw-surface.js";
import type { DrawTool } from "./use-draw-tool.js";

interface SurfaceProps {
  draw: DrawTool;
  control: CommentsControl;
  zoom: number;
  frame: DrawFrame;
  tools: CommentTools;
}

const submitDrawing = async (
  control: CommentsControl,
  draw: DrawTool,
  frame: DrawFrame,
  input: ComposerSubmit
): Promise<boolean> => {
  const area = strokesBox(draw.strokes);

  if (!area) {
    return false;
  }

  const value: CommentDrawing = {
    box: area,
    frame: {
      height: Math.round(frame.height),
      width: Math.round(frame.width),
    },
    strokes: draw.strokes,
  };

  const png = await toValueOr(renderDrawingPng(value), null);

  if (!png) {
    return false;
  }

  const ok = await control.addDrawing({
    drawing: value,
    extras: { attachmentIds: input.attachmentIds, mentions: input.mentions },
    image: png,
    text: input.text,
    toClaude: input.toClaude,
  });

  if (ok) {
    draw.setOn(false);
  }

  return ok;
};

const DrawSurface = ({
  draw,
  control,
  zoom,
  frame,
  tools,
}: SurfaceProps): ReactElement => {
  const initial = useProfileInitial();

  const { canvasRef, isDrawing, onDown, onMove, onUp, scale } = useDrawSurface(
    draw,
    zoom,
    frame
  );

  const box = strokesBox(draw.strokes);

  const { setOn } = draw;

  const submit = useCallback(
    (input: ComposerSubmit) => submitDrawing(control, draw, frame, input),
    [control, draw, frame]
  );

  const cancel = useCallback(() => setOn(false), [setOn]);

  const style = useMemo<CSSProperties>(
    () => ({ height: frame.height, width: frame.width }),
    [frame.height, frame.width]
  );

  const breadcrumb = useMemo(
    () => ({
      full: `${tools.pageName} › Drawing`,
      short: `${tools.pageName} › Drawing`,
    }),
    [tools.pageName]
  );

  return (
    <>
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        data-testid="draw-canvas"
        aria-label={copy.drawingArea}
        width={Math.max(1, Math.round(frame.width * scale))}
        height={Math.max(1, Math.round(frame.height * scale))}
        style={style}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {box && !isDrawing && (
        <CommentComposer
          key="draw"
          label="Comment on drawing"
          testId="draw-compose"
          anchor={box}
          zoom={zoom}
          frame={frame}
          breadcrumb={breadcrumb}
          initial={initial}
          draftKey="draw"
          autoFocus
          trap
          running={control.running}
          busy={control.sending}
          sources={tools.sources}
          images
          steer={false}
          onSubmit={submit}
          onCancel={cancel}
        />
      )}
    </>
  );
};

export { DrawSurface, DrawingStrokes, PenIcon };
