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
import { startOptimistic } from "../inspector/optimistic-edit.js";
import { buildEditRequest, mergeCommit } from "../inspector/use-direct-edit.js";
import {
  resizeReadout,
  resizedSize,
  snapSize,
  styleFor,
  toResizeLive,
  toResizeTarget,
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

const commitDrag = async (
  live: RefObject<Options>,
  drag: Drag
): Promise<void> => {
  const cur = live.current;
  const style = styleFor(drag.size, drag.base);
  const req = buildEditRequest(drag.target, style);

  if (!req || !cur.directionId) {
    return;
  }

  const { selector } = drag.target;
  cur.setSelection((prev) => mergeCommit(prev, { selector, style }));

  const optimistic = startOptimistic(
    { post: cur.post, refreshRects: cur.refreshRects },
    req,
    (message) => live.current.onError(message)
  );

  try {
    const result = await api.directEdit(cur.projectId, cur.directionId, req);
    optimistic.saved(result.tailwind);
    live.current.refreshRects();
  } catch (error) {
    optimistic.failed(errorText(error));

    const back = {
      height: drag.target.styles.height ?? "",
      width: drag.target.styles.width ?? "",
    };

    live.current.setSelection((prev) =>
      mergeCommit(prev, { selector, style: back })
    );
    live.current.onError(errorText(error));
  }
};

const useResizeLive = ({
  target,
  sizes,
  onHandleDown,
}: ResizeHandles): ResizeControl => {
  const size = useLive(sizes);

  return { live: toResizeLive(size, target), onHandleDown, target };
};

const useResizeHandles = (options: Options): ResizeHandles => {
  const live = useRef(options);

  useLayoutEffect(() => {
    live.current = options;
  });

  const drag = useRef<Drag | null>(null);
  const sizes = useMemo(() => createLiveStore<LiveSize | null>(null), []);
  const target = toResizeTarget(options);

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

  return { onHandleDown, sizes, target };
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
