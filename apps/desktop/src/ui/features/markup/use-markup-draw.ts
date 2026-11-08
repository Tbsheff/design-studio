import { useCallback, useState } from "react";
import type { PointerEvent } from "react";

import { isMeaningful } from "./markup-model.js";
import type { MarkupPoint, MarkupStroke, MarkupTool } from "./markup-model.js";

interface FrameSize {
  readonly height: number;
  readonly width: number;
}

interface MarkupDraw {
  readonly draft: MarkupStroke | null;
  readonly handleCancelNote: () => void;
  readonly handleCommitNote: (text: string) => void;
  readonly handleDown: (event: PointerEvent<SVGSVGElement>) => void;
  readonly handleMove: (event: PointerEvent<SVGSVGElement>) => void;
  readonly handleTool: (tool: MarkupTool) => void;
  readonly handleUndo: () => void;
  readonly handleUp: (event: PointerEvent<SVGSVGElement>) => void;
  readonly pendingNote: MarkupPoint | null;
  readonly strokes: readonly MarkupStroke[];
  readonly tool: MarkupTool;
}

const toFramePoint = (
  event: PointerEvent<SVGSVGElement>,
  size: FrameSize
): MarkupPoint => {
  const bounds = event.currentTarget.getBoundingClientRect();
  const scale = size.width / bounds.width;

  return {
    x: (event.clientX - bounds.left) * scale,
    y: (event.clientY - bounds.top) * scale,
  };
};

const toStartStroke = (
  tool: MarkupTool,
  point: MarkupPoint
): MarkupStroke | null => {
  if (tool === "pen") {
    return { id: 0, kind: "pen", points: [point] };
  }

  if (tool === "arrow" || tool === "box") {
    return { from: point, id: 0, kind: tool, to: point };
  }

  return null;
};

const toMovedStroke = (
  stroke: MarkupStroke,
  point: MarkupPoint
): MarkupStroke => {
  if (stroke.kind === "pen") {
    return { ...stroke, points: [...stroke.points, point] };
  }

  if (stroke.kind === "note") {
    return stroke;
  }

  return { ...stroke, to: point };
};

const useMarkupNote = (
  addStroke: (stroke: MarkupStroke) => void
): Pick<MarkupDraw, "handleCancelNote" | "handleCommitNote" | "pendingNote"> & {
  readonly handleOpenNote: (point: MarkupPoint) => void;
} => {
  const [pendingNote, setPendingNote] = useState<MarkupPoint | null>(null);

  const handleCommitNote = useCallback(
    (text: string): void => {
      if (pendingNote && text.trim() !== "") {
        addStroke({
          at: pendingNote,
          id: 0,
          kind: "note",
          text: text.trim(),
        });
      }

      setPendingNote(null);
    },
    [addStroke, pendingNote]
  );

  const handleOpenNote = useCallback(
    (point: MarkupPoint): void => setPendingNote(point),
    []
  );

  const handleCancelNote = useCallback((): void => setPendingNote(null), []);

  return {
    handleCancelNote,
    handleCommitNote,
    handleOpenNote,
    pendingNote,
  };
};

const useMarkupDraw = (size: FrameSize): MarkupDraw => {
  const [tool, setTool] = useState<MarkupTool>("pen");
  const [strokes, setStrokes] = useState<readonly MarkupStroke[]>([]);
  const [draft, setDraft] = useState<MarkupStroke | null>(null);

  const addStroke = useCallback((stroke: MarkupStroke): void => {
    setStrokes((current) => [...current, { ...stroke, id: current.length }]);
  }, []);

  const handleTool = useCallback((next: MarkupTool): void => setTool(next), []);

  const note = useMarkupNote(addStroke);
  const { handleOpenNote } = note;

  const handleDown = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      const point = toFramePoint(event, size);

      if (tool === "note") {
        handleOpenNote(point);

        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      setDraft(toStartStroke(tool, point));
    },
    [handleOpenNote, size, tool]
  );

  const handleMove = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      const point = toFramePoint(event, size);
      setDraft((current) => current && toMovedStroke(current, point));
    },
    [size]
  );

  const handleUp = useCallback(
    (event: PointerEvent<SVGSVGElement>): void => {
      if (draft) {
        const done = toMovedStroke(draft, toFramePoint(event, size));

        if (isMeaningful(done)) {
          addStroke(done);
        }
      }

      setDraft(null);
    },
    [addStroke, draft, size]
  );

  const handleUndo = useCallback((): void => {
    setStrokes((current) => current.slice(0, -1));
  }, []);

  return {
    draft,
    handleDown,
    handleMove,
    handleTool,
    handleUndo,
    handleUp,
    strokes,
    tool,
    ...note,
  };
};

export { useMarkupDraw };

export type { FrameSize, MarkupDraw };
