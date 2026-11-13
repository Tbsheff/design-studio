import { Suspense, lazy } from "react";
import type { ComponentProps, ReactElement } from "react";

const CanvasRulers = lazy(async () => {
  const loaded = await import("./canvas-rulers.js");

  return { default: loaded.CanvasRulers };
});

const RulerGuideLayer = lazy(async () => {
  const loaded = await import("./ruler-guide-layer.js");

  return { default: loaded.RulerGuideLayer };
});

interface StageRulersProps extends ComponentProps<typeof CanvasRulers> {
  readonly projectId: string;
}

const StageRulers = (props: StageRulersProps): ReactElement => (
  <Suspense fallback={null}>
    <CanvasRulers
      artboardRef={props.artboardRef}
      origin={props.origin}
      selection={props.selection}
    />
    <RulerGuideLayer
      artboardRef={props.artboardRef}
      origin={props.origin}
      projectId={props.projectId}
    />
  </Suspense>
);

export { StageRulers };
