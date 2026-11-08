import type { ReactElement } from "react";

import { pageFileOf } from "../chat/use-first-build.js";
import type { PageWait } from "../chat/use-first-build.js";
import { FrameSkeleton } from "./frame-skeleton-view.js";

const FirstBuildCover = ({
  covered,
  wait,
  step,
  path,
}: {
  covered: boolean;
  wait: PageWait;
  step: string | null | undefined;
  path: string | undefined;
}): ReactElement | null => {
  if (wait === "missing") {
    return <FrameSkeleton step={null} missing={pageFileOf(path)} />;
  }

  if (covered) {
    return <FrameSkeleton step={step ?? null} />;
  }

  return null;
};

export { FirstBuildCover };
