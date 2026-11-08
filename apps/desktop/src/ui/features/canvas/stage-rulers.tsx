import { Suspense, lazy } from "react";
import type { ComponentProps, ReactElement } from "react";

const CanvasRulers = lazy(async () => {
  const loaded = await import("./canvas-rulers.js");

  return { default: loaded.CanvasRulers };
});

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
