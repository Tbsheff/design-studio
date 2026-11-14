import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

import { api, errorText } from "../../api.js";
import { createLiveStore, useLive } from "../../platform/live-store.js";
import { scaleMode } from "../../platform/scale-mode.js";
import {
  applyCommit,
  createCurrentEditRequest,
  startOptimistic,
} from "../inspector/index.js";
import {
  resizeReadout,
  resizedSize,
  snapSize,
  toBackStyle,
  toDragStyle,
  toResizeLive,
  toResizeTarget,
  toRotateTargets,
} from "./resize-handles-model.js";
import type {
  Drag,
  LiveSize,
  Options,
  ResizeControl,
  ResizeEdge,
  ResizeHandles,
  ResizeLive,
  ResizeReadout,
} from "./resize-handles-model.js";
import { beginResize, cancelDrag } from "./resize-handles-session.js";
import { useGroupResize } from "./use-group-resize.js";
import { useRotateDrag } from "./use-rotate-drag.js";
import { useScaleDrag } from "./use-scale-drag.js";

const commitDrag = async (
  live: RefObject<Options>,
  drag: Drag
): Promise<void> => {
  const cur = live.current;
  const style = toDragStyle(drag);
  const req = createCurrentEditRequest(drag.target, style);

  if (!req || !cur.directionId) {
    return;
  }

  const { selector } = drag.target;
  cur.setSelection((prev) => applyCommit(prev, { selector, style }));

  const optimistic = startOptimistic(
    { post: cur.post, refreshRects: cur.refreshRects },
    req,
    (message) => live.current.onError(message)
  );

  try {
    const result = await api.directEdit(cur.projectId, cur.directionId, req);
    optimistic.saved(result.tailwind ?? null);
    live.current.refreshRects();
  } catch (error) {
    optimistic.failed(errorText(error));

    const back = toBackStyle(drag);

    live.current.setSelection((prev) =>
      applyCommit(prev, { selector, style: back })
    );
    live.current.onError(errorText(error));
  }
};

const useResizeLive = ({
  target,
  sizes,
  onHandleDown,
  ghost: ghostStore,
  groupBox: groupBoxStore,
  onGroupDown,
  onRotateDown,
  onScaleDown,
  rotateLabel: rotateLabelStore,
  rotateTargets,
}: ResizeHandles): ResizeControl => {
  const size = useLive(sizes);
  const ghost = useLive(ghostStore);
  const groupBox = useLive(groupBoxStore);
  const rotateLabel = useLive(rotateLabelStore);
  const isScaling = useLive(scaleMode) && target !== null;
  const live = toResizeLive(size, target);

  return {
    ghost,
    groupBox,
    isScaling,
    live,
    onGroupDown,
    onHandleDown,
    onRotateDown,
    onScaleDown,
    rotateLabel,
    rotateTargets,
    target,
  };
};

const useResizeHandles = (options: Options): ResizeHandles => {
  const live = useRef(options);

  useLayoutEffect(() => {
    live.current = options;
  });

  const drag = useRef<Drag | null>(null);
  const sizes = useMemo(() => createLiveStore<LiveSize | null>(null), []);
  const target = toResizeTarget(options);
  const { enabled, selection } = options;

  const rotateTargets = useMemo(
    () => toRotateTargets(enabled, selection),
    [enabled, selection]
  );

  const commit = useCallback(
    (finished: Drag): Promise<void> => commitDrag(live, finished),
    [live]
  );

  const context = useMemo(
    () => ({ commit, drag, live, setSize: sizes.set }),
    [commit, drag, live, sizes]
  );

  const onHandleDown = useCallback(
    (edge: ResizeEdge, event: ReactPointerEvent<HTMLElement>): void =>
      beginResize(context, target, edge, event),
    [context, target]
  );

  useEffect(() => (): void => cancelDrag(context), [context]);

  const { ghost, onScaleDown } = useScaleDrag(live, target);

  const { label: rotateLabel, onRotateDown } = useRotateDrag(
    live,
    rotateTargets
  );

  const { box: groupBox, onGroupDown } = useGroupResize(live, rotateTargets);

  return {
    ghost,
    groupBox,
    onGroupDown,
    onHandleDown,
    onRotateDown,
    onScaleDown,
    rotateLabel,
    rotateTargets,
    sizes,
    target,
  };
};

export {
  resizeReadout,
  resizedSize,
  snapSize,
  useResizeHandles,
  useResizeLive,
};

export type {
  ResizeControl,
  ResizeEdge,
  ResizeHandles,
  ResizeLive,
  ResizeReadout,
};
