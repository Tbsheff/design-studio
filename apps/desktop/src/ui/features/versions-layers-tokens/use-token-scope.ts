import { useMemo } from "react";

import type { TokenScope } from "./token-usage-context.js";

const useTokenScope = (
  directionId: string | null,
  projectId: string
): TokenScope | null =>
  useMemo(() => {
    if (directionId === null) {
      return null;
    }

    return { directionId, projectId };
  }, [directionId, projectId]);

export { useTokenScope };
