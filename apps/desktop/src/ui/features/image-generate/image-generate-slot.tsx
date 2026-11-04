import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { GenerateSetup } from "./use-generate.js";

const GeneratePanel = lazy(async () => {
  const loaded = await import("./generate-panel.js");

  return { default: loaded.GeneratePanel };
});

const ImageGenerateSlot = (setup: GenerateSetup): ReactElement => {
  const handleDone = setup.onDone;

  return (
    <Suspense fallback={null}>
      <GeneratePanel
        directionId={setup.directionId}
        projectId={setup.projectId}
        target={setup.target}
        onDone={handleDone}
      />
    </Suspense>
  );
};

export { ImageGenerateSlot };
