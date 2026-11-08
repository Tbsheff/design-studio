import type { ReactElement } from "react";
import { memo, useLayoutEffect, useState } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import { useStableProps } from "../inspector/stable-props.js";
import type { Props } from "./canvas-types.js";
import { CanvasView } from "./canvas-view.js";

const MemoCanvas = memo(CanvasView);

const NESTED = new Set(["shell", "commentTools", "comments", "directions"]);

const NESTED_LIVE_DIRECTIONS = new Set(["shell", "commentTools", "comments"]);

const Canvas = ({ runStep, ...props }: Props): ReactElement => {
  const variations =
    props.directions?.list.some((direction) => direction.variation) === true;
  const [steps] = useState(() => createLiveStore<string | null>(null));
  useLayoutEffect(() => steps.set(runStep ?? null), [steps, runStep]);

  return (
    <MemoCanvas
      {...useStableProps(
        { ...props, steps },
        variations ? NESTED_LIVE_DIRECTIONS : NESTED
      )}
    />
  );
};

export { Canvas };
