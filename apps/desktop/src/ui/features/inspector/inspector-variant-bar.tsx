import { Suspense, lazy } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { VariantSupport } from "../../../shared/variants.js";
import type { PreviewPort } from "../../platform/bridge.js";

interface Props {
  readonly selector: string;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly support: VariantSupport | null;
  readonly quietNote: string | null;
}

const LazyVariantBar = lazy(async () => {
  await import("../../styles/inspector-variants.css");
  const loaded = await import("./variant-bar-view.js");

  return { default: loaded.VariantBarView };
});

const InspectorVariantBar = ({
  selector,
  port,
  support,
  quietNote,
}: Props): ReactElement => (
  <Suspense fallback={null}>
    <LazyVariantBar
      selector={selector}
      port={port}
      support={support}
      quietNote={quietNote}
    />
  </Suspense>
);

export { InspectorVariantBar };
