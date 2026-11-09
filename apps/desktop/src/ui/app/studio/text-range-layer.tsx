import type { SelectionContext } from "@design-studio/contracts";
import { Suspense } from "react";
import type { ReactNode, RefObject } from "react";

import { TextRangeBar } from "../../features/text-range";
import type { PreviewPort } from "../../platform/bridge";

interface TextRangeLayerProps {
  readonly directionId: string | null;
  readonly port: RefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[];
}

const TextRangeLayer = ({
  directionId,
  port,
  projectId,
  selection,
}: TextRangeLayerProps): ReactNode => {
  const target = selection.at(0) ?? null;

  return (
    <Suspense fallback={null}>
      <TextRangeBar
        directionId={directionId}
        port={port}
        projectId={projectId}
        selector={target?.selector ?? null}
        source={target?.source ?? null}
      />
    </Suspense>
  );
};

export { TextRangeLayer };
