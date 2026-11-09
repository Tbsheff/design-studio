import { routes } from "@design-studio/actions/token/routes";
import { useCallback } from "react";

import { useAction } from "../../platform/query.js";
import type { TokenScope } from "./token-usage-context.js";

const useTokenDelete = (
  name: string,
  scope: TokenScope | null
): (() => void) => {
  const { run } = useAction(routes.deleteToken);

  return useCallback((): void => {
    if (scope === null) {
      return;
    }

    run({ ...scope, name });
  }, [name, run, scope]);
};

export { useTokenDelete };
