import type { ShipSettings } from "@design-studio/contracts/ship";
import { useCallback, useEffect, useState } from "react";

import { shipApi } from "./ship-api.js";

interface ShipSettingsState {
  draft: ShipSettings | null;
  loadError: string | null;
  patch: (patch: Partial<ShipSettings>) => void;
}

const useShipSettings = (projectId: string): ShipSettingsState => {
  const [draft, setDraft] = useState<ShipSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;

    const load = async (): Promise<void> => {
      try {
        const settings = await shipApi.settings(projectId);

        if (live) {
          setDraft(settings);
        }
      } catch {
        if (live) {
          setLoadError("Could not read the ship templates.");
        }
      }
    };

    load();

    return (): void => {
      live = false;
    };
  }, [projectId]);

  const patch = useCallback((change: Partial<ShipSettings>): void => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return { ...prev, ...change };
    });
  }, []);

  return { draft, loadError, patch };
};

export { useShipSettings };
