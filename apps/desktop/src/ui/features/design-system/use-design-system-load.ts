import { useEffect, useState } from "react";

import { api, errorText } from "../../api.js";
import type { TokenLoad } from "./chip-model.js";
import type { DesignSystemRef } from "./design-system-ref.js";

const useDesignSystemLoad = (
  system: DesignSystemRef,
  isOpen: boolean
): TokenLoad => {
  const [load, setLoad] = useState<TokenLoad>({ error: null, state: null });
  const { directionId, projectId } = system;

  useEffect(() => {
    if (!isOpen || !directionId) {
      return;
    }

    let isLive = true;

    const read = async (): Promise<void> => {
      try {
        const state = await api.getDesignSystem(projectId, directionId);

        if (isLive) {
          setLoad({ error: null, state });
        }
      } catch (error) {
        if (isLive) {
          setLoad((prev) => ({ error: errorText(error), state: prev.state }));
        }
      }
    };

    read();

    return (): void => {
      isLive = false;
    };
  }, [isOpen, projectId, directionId]);

  return load;
};

export { useDesignSystemLoad };
