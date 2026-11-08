import { useEffect, useState } from "react";

import type { FoundApps } from "./deps.js";
import { projectsApi } from "./projects-store-model.js";

const useFound = (): FoundApps | null | "error" => {
  const [found, setFound] = useState<FoundApps | null | "error">(null);
  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const next = await projectsApi.found();

        if (live) {
          setFound(next);
        }
      } catch {
        if (live) {
          setFound("error");
        }
      }
    };

    load();

    return (): void => {
      live = false;
    };
  }, []);

  return found;
};

export { useFound };
