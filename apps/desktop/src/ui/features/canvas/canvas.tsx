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

  let argument: Set<string> = NESTED;

  if (variations) {
    argument = NESTED_LIVE_DIRECTIONS;
  }

  return <MemoCanvas {...useStableProps({ ...props, steps }, argument)} />;
};

export { Canvas };
