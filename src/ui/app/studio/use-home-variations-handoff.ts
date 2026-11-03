import { useEffect } from "react";

import { homeVariations } from "../../storage";
import type { useVariations } from "../../useVariations";

const useHomeVariationsHandoff = (
  projectId: string,
  ready: boolean,
  propose: ReturnType<typeof useVariations>["propose"]
): void => {
  useEffect(() => {
    if (!ready) {
      return;
    }

    const intent = homeVariations.take(projectId);

    if (intent) {
      void propose(intent.prompt, intent.level, [], intent.count);
    }
  }, [ready, projectId, propose]);
};

export { useHomeVariationsHandoff };
