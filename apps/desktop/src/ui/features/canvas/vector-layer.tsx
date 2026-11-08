import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactElement } from "react";

import type { VectorRequest, VectorResult } from "../../../shared/vector.js";
import { errorText } from "../../api.js";
import type { ParentMessageBody } from "../../platform/bridge.js";
import { penPath } from "./drawing-model.js";
import type { PenAnchor } from "./drawing-model.js";
import { PenPreview } from "./pen-preview.js";
import { DragBoxPreview } from "./shape-preview.js";

import "../../styles/vector.css";
import { runVector, useVectorTool, vectorTool } from "./vector-tool-model.js";
import type { VectorToolId } from "./vector-tool-model.js";

const ITEM_500 = 500;

const ITEM_1200 = 1200;

const ITEM_2500 = 2500;

const PX_3 = 3;

interface Point {
  x: number;
  y: number;
}

type Placed =
  | Omit<Extract<VectorRequest, { op: "shape" }>, "target" | "relativeParent">
  | Omit<Extract<VectorRequest, { op: "path" }>, "target" | "relativeParent">;

interface Drop {
  selection: SelectionContext | null;
  inside: boolean;
}

interface Props {
  projectId: string;
  directionId: string;
  zoom: number;
  frame: { width: number; height: number };
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  notify: (message: string) => void;
  page?: string;
}

const CLOSE_HIT_SCREEN = 8;
const DRAG_SCREEN = 3;
const DEFAULT_SIZE = 100;
const DROP_WAIT_MS = 1500;
const RESELECT_MS = [ITEM_500, ITEM_1200, ITEM_2500];

const useDropAt = (post: Props["post"], listen: Props["listen"]) => {
  const waiting = useRef(new Map<string, (drop: Drop) => void>());
  const seq = useRef(0);
  useEffect(
    () =>
      listen((message) => {
        if (message.type !== "element-at") {
          return;
        }

        const done = waiting.current.get(message.requestId);

        if (!done) {
          return;
        }

        waiting.current.delete(message.requestId);
        done({ inside: message.inside, selection: message.selection });
      }),
    [listen]
  );

  return (point: Point): Promise<Drop> =>
    new Promise((resolve) => {
      const id = `vector-${++seq.current}`;
      waiting.current.set(id, resolve);
      window.setTimeout(() => {
        if (waiting.current.delete(id)) {
          resolve({ inside: false, selection: null });
        }
      }, DROP_WAIT_MS);
      post({ requestId: id, type: "element-at", x: point.x, y: point.y });
    });
};

const px = (value: string | undefined, index: number): number => {
  const parts = (value ?? "").trim().split(/\s+/);
  const raw = parts[index] ?? parts[index % 2] ?? parts[0] ?? "0";

  return Number.parseFloat(raw) || 0;
};

const placeOf = (
  drop: Drop
):
  | { target: InsertTarget; origin: Point; relativeParent: boolean }
  | string => {
  const { selection } = drop;

  if (!selection) {
    return "Start the drawing on an element in the frame.";
  }

  const body = selection.tag.toLowerCase() === "body";

  if (!selection.source && !selection.owners?.length && !body) {
    return "This element has no source location, so the studio cannot draw into it.";
  }

  const border = selection.styles["border-width"];

  const origin = {
    x: selection.rect.x + px(border, PX_3),
    y: selection.rect.y + px(border, 0),
  };

  const target: InsertTarget = {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
    ...(selection.owners?.length ? { owners: selection.owners } : {}),
  };

  return {
    origin,
    relativeParent: (selection.styles.position ?? "static") === "static",
    target,
  };
};

const boxOf = (
  point: Point,
  point2: Point,
  square: boolean
): { height: number; width: number; x: number; y: number } => {
  let width = Math.abs(point2.x - point.x);
  let height = Math.abs(point2.y - point.y);

  if (square) {
    width = height = Math.max(width, height);
  }

  return {
    height,
    width,
    x: point2.x < point.x ? point.x - width : point.x,
    y: point2.y < point.y ? point.y - height : point.y,
  };
};

const useCommit = (props: Props, dropAt: (point: Point) => Promise<Drop>) => {
  const busy = useRef(false);

  return async (at: Point, build: (origin: Point) => Placed): Promise<void> => {
    if (busy.current) {
      return;
    }

    busy.current = true;

    try {
      const place = placeOf(await dropAt(at));

      if (typeof place === "string") {
        return props.notify(place);
      }

      const request = {
        ...build(place.origin),
        relativeParent: place.relativeParent,
        target: place.target,
        ...(props.page ? { page: props.page } : {}),
      } as VectorRequest;

      const result: VectorResult = await runVector(
        props.projectId,
        props.directionId,
        request
      );

      vectorTool.set(null);
      const at0 = result.select[0];

      if (at0) {
        for (const wait of RESELECT_MS) {
          window.setTimeout(
            () =>
              props.post({
                sourceLoc: `${at0.file}:${at0.line}:${at0.col}`,
                tag: at0.tag,
                text: "",
                type: "select-source",
              }),
            wait
          );
        }
      }
    } catch (error) {
      props.notify(errorText(error));
    } finally {
      busy.current = false;
    }
  };
};

const useShapeTool = (
  props2: Props,
  tool: VectorToolId,
  commit: ReturnType<typeof useCommit>,
  pointOf: (event: PointerEvent) => Point | null
): {
  onDown: (event: PointerEvent<HTMLDivElement>) => void;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onUp: (event: PointerEvent<HTMLDivElement>) => void;
  preview: ReactElement | null;
} => {
  const [drag, setDrag] = useState<{
    from: Point;
    to: Point;
    square: boolean;
  } | null>(null);

  const onDown = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (event.button !== 0 || !point) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ from: point, square: event.shiftKey, to: point });
  };

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (drag && point) {
      setDrag({ ...drag, square: event.shiftKey, to: point });
    }
  };

  const onUp = (event: PointerEvent<HTMLDivElement>): void => {
    if (!drag) {
      return;
    }

    setDrag(null);
    const to = pointOf(event) ?? drag.to;

    const moved =
      Math.hypot(to.x - drag.from.x, to.y - drag.from.y) * props2.zoom >
      DRAG_SCREEN;

    const box = moved
      ? boxOf(drag.from, to, event.shiftKey)
      : {
          height: DEFAULT_SIZE,
          width: DEFAULT_SIZE,
          x: drag.from.x,
          y: drag.from.y,
        };

    const shape = tool === "ellipse" ? "ellipse" : "rect";
    void commit(drag.from, (origin) => ({
      box: {
        height: box.height,
        width: box.width,
        x: box.x - origin.x,
        y: box.y - origin.y,
      },
      op: "shape",
      shape,
    }));
  };

  const preview = drag ? (
    <DragBoxPreview
      tool={tool}
      box={boxOf(drag.from, drag.to, drag.square)}
      zoom={props2.zoom}
    />
  ) : null;

  return { onDown, onMove, onUp, preview };
};

const usePenTool = (
  props3: Props,
  commit: ReturnType<typeof useCommit>,
  pointOf: (event: PointerEvent) => Point | null
): {
  drawing: boolean;
  onDown: (event: PointerEvent<HTMLDivElement>) => void;
  onKey: (key: string) => boolean;
  onMove: (event: PointerEvent<HTMLDivElement>) => void;
  onUp: () => void;
  preview: ReactElement;
} => {
  const [anchors, setAnchors] = useState<PenAnchor[]>([]);
  const [hover, setHover] = useState<Point | null>(null);
  const dragging = useRef(false);
  const live = useRef(anchors);
  live.current = anchors;

  const nearFirst = (point: Point | null): boolean => {
    const first = live.current[0];

    return Boolean(
      point &&
      first &&
      live.current.length >= 2 &&
      Math.hypot(point.x - first.x, point.y - first.y) * props3.zoom <=
        CLOSE_HIT_SCREEN
    );
  };

  const finish = (closed: boolean): void => {
    const list = live.current;
    setAnchors([]);
    setHover(null);
    const first = list[0];

    if (!first || list.length < 2) {
      return vectorTool.set(null);
    }

    void commit(first, (origin) => ({
      d: penPath(list, closed, -origin.x, -origin.y),
      op: "path",
      ...(closed ? { fill: "#D9D9D9" } : {}),
    }));
  };

  const onDown = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (event.button !== 0 || !point) {
      return;
    }

    event.preventDefault();

    if (nearFirst(point)) {
      return finish(true);
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    setAnchors((prev) => [...prev, { x: point.x, y: point.y }]);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>): void => {
    const point = pointOf(event);

    if (!point) {
      return;
    }

    setHover(point);

    if (!dragging.current) {
      return;
    }

    setAnchors((prev) => {
      const last = prev.at(-1);

      if (
        !last ||
        Math.hypot(point.x - last.x, point.y - last.y) * props3.zoom <
          DRAG_SCREEN
      ) {
        return prev;
      }

      return [
        ...prev.slice(0, -1),
        {
          hin: { x: 2 * last.x - point.x, y: 2 * last.y - point.y },
          hout: point,
          x: last.x,
          y: last.y,
        },
      ];
    });
  };

  const onUp = (): void => {
    dragging.current = false;
  };

  const onKey = (key: string): boolean => {
    if (key === "Enter" && live.current.length > 0) {
      finish(true);
    } else if (key === "Escape" && live.current.length > 0) {
      finish(false);
    } else if (key === "Backspace" && live.current.length > 0) {
      setAnchors((prev) => prev.slice(0, -1));
    } else {
      return false;
    }

    return true;
  };

  const preview = (
    <PenPreview
      anchors={anchors}
      hover={dragging.current ? null : hover}
      zoom={props3.zoom}
      closing={nearFirst(hover)}
    />
  );

  return { drawing: anchors.length > 0, onDown, onKey, onMove, onUp, preview };
};

const HINTS: Record<VectorToolId, string> = {
  ellipse: "Drag to draw an ellipse. Shift keeps it round. Esc stops.",
  pen: "Click to add points, drag to curve. Click the first point or press Enter to close, Esc to end.",
  rect: "Drag to draw a rectangle. Shift keeps it square. Esc stops.",
};

export default function VectorLayer(props4: Props): ReactElement | null {
  const { tool } = useVectorTool();
  const root = useRef<HTMLDivElement>(null);
  const dropAt = useDropAt(props4.post, props4.listen);
  const commit = useCommit(props4, dropAt);

  const pointOf = (event: {
    clientX: number;
    clientY: number;
  }): Point | null => {
    const rect = root.current?.getBoundingClientRect();

    if (!rect || rect.width === 0) {
      return null;
    }

    return {
      x: ((event.clientX - rect.left) * props4.frame.width) / rect.width,
      y: ((event.clientY - rect.top) * props4.frame.height) / rect.height,
    };
  };

  const shape = useShapeTool(props4, tool ?? "rect", commit, pointOf);
  const pen = usePenTool(props4, commit, pointOf);
  const penOn = tool === "pen";
  const penKey = useRef(pen.onKey);
  penKey.current = pen.onKey;

  const active = tool !== null;
  useEffect(() => {
    if (!active) {
      return;
    }

    const onKey = (event: KeyboardEvent): void => {
      if (penOn && penKey.current(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        vectorTool.set(null);
      }
    };

    globalThis.addEventListener("keydown", onKey, true);

    return (): void => globalThis.removeEventListener("keydown", onKey, true);
  }, [active, penOn]);

  if (!tool) {
    return null;
  }

  const handlers = penOn ? pen : shape;

  return (
    <div
      ref={root}
      className={`vector-layer ${tool}`}
      data-testid="vector-layer"
      aria-label={`${tool === "pen" ? "Pen" : tool === "rect" ? "Rectangle" : "Ellipse"} tool`}
      style={
        {
          width: props4.frame.width,
          height: props4.frame.height,
          ["--inv-zoom" as string]: 1 / props4.zoom,
        } as CSSProperties
      }
      tabIndex={-1}
      onPointerDown={(event) => {
        root.current?.focus({ preventScroll: true });
        handlers.onDown(event);
      }}
      onPointerMove={handlers.onMove}
      onPointerUp={handlers.onUp}
      onPointerCancel={handlers.onUp}
    >
      {handlers.preview}
      <span className="vector-hint" role="status">
        {HINTS[tool]}
      </span>
    </div>
  );
}

export type { Point };
