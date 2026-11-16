import type { SelectionContext } from "@design-studio/contracts";
import { Suspense } from "react";
import type { ReactElement } from "react";

import { ContentPanel } from "../../inspector-slots.js";
import { copy } from "./copy.js";
import { RareSection } from "./rare-section.js";

interface SampleContentSectionProps {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly target: SelectionContext;
}

const SampleContentSection = ({
  projectId,
  directionId,
  target,
}: SampleContentSectionProps): ReactElement | null => {
  if (!directionId || !target.source) {
    return null;
  }

  return (
    <RareSection title={copy.sampleContent} aside={null} modifier={null}>
      <Suspense fallback={null}>
        <ContentPanel
          projectId={projectId}
          directionId={directionId}
          target={target}
        />
      </Suspense>
    </RareSection>
  );
};

export { SampleContentSection };
