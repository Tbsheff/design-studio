import { routes as studioRoutes } from "@design-studio/actions/studio/routes";
import { useEffect, useState } from "react";

import { call } from "../../platform/http.js";

const useDoctorVersion = (): string | null => {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const read = async (): Promise<void> => {
      try {
        const health = await call(studioRoutes.healthStudio, {});

        if (live) {
          setVersion(health.version);
        }
      } catch {
        if (live) {
          setVersion(null);
        }
      }
    };

    read();

    return (): void => {
      live = false;
    };
  }, []);

  return version;
};

export { useDoctorVersion };
