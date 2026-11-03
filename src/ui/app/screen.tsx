import { Suspense } from "react";
import type { ReactNode } from "react";

import { BootMessage } from "./boot-message";
import { copy } from "./copy";
import { ScreenBoundary } from "./screen-boundary";

const fallback = <BootMessage>{copy.loadingProject}</BootMessage>;

const Screen = ({ children }: { children: ReactNode }): ReactNode => (
  <ScreenBoundary>
    <Suspense fallback={fallback}>{children}</Suspense>
  </ScreenBoundary>
);

export { Screen };
