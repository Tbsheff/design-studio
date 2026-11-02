import { Suspense, lazy } from "react";
import type { ReactElement } from "react";

import type { TextStyleMenuProps } from "./text-style-menu.js";

const TextStyleMenu = lazy(async () => {
  const loaded = await import("./text-style-menu.js");

  return { default: loaded.TextStyleMenu };
});

const TextStyleSlot = ({
  directionId,
  projectId,
  targets,
}: TextStyleMenuProps): ReactElement => (
  <Suspense fallback={null}>
    <TextStyleMenu
      directionId={directionId}
      projectId={projectId}
      targets={targets}
    />
  </Suspense>
);

export { TextStyleSlot };
