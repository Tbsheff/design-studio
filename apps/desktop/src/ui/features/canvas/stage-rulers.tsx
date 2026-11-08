import { Suspense, lazy } from "react";
import type { ComponentProps, ReactElement } from "react";

const CanvasRulers = lazy(() => import("./canvas-rulers.js"));

const StageRulers = (
  props: ComponentProps<typeof CanvasRulers>
): ReactElement => (
  <Suspense fallback={null}>
    <CanvasRulers
      artboardRef={props.artboardRef}
      origin={props.origin}
      selection={props.selection}
    />
  </Suspense>
);

export { StageRulers };
