import { useEffect } from "react";

import { prefetchScreensWhenIdle } from "../../app/screen-preload.js";
import { reportAppStart } from "../../platform/telemetry.js";

const useHomeStartup = (isListed: boolean): void => {
  useEffect(() => {
    if (!isListed) {
      return;
    }

    reportAppStart("home");
    prefetchScreensWhenIdle();
  }, [isListed]);
};

export { useHomeStartup };
