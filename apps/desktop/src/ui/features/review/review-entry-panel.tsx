import { lazy, Suspense } from "react";
import type { ComponentProps, ReactElement } from "react";

const ReviewPanel = lazy(async () => {
  const loaded = await import("./review-panel.js");

  return { default: loaded.ReviewPanel };
});

type Props = ComponentProps<typeof ReviewPanel>;

const ReviewEntryPanel = (props: Props): ReactElement => (
  <Suspense fallback={null}>
    <ReviewPanel
      review={props.review}
      frameLabel={props.frameLabel}
      live={props.live}
      running={props.running}
      canAsk={props.canAsk}
      onSelect={props.onSelect}
      onAsk={props.onAsk}
      onClose={props.onClose}
    >
      {props.children}
    </ReviewPanel>
  </Suspense>
);

export { ReviewEntryPanel };
