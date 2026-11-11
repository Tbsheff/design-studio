import { useEffect } from "react";

import { reportAppStart } from "../../platform/telemetry.js";

const useHomeStartup = (isListed: boolean): void => {
  useEffect(() => {
    if (!isListed) {
      return;
    }

    reportAppStart("home");
  }, [isListed]);
};

export { useHomeStartup };
