import { useCallback, useRef } from "react";

import { randomToken } from "../../platform/session.js";

const useTokenCache = (): ((id: string) => string) => {
  const tokens = useRef(new Map<string, string>());

  return useCallback((id: string): string => {
    const known = tokens.current.get(id);

    if (known) {
      return known;
    }

    const token = randomToken();
    tokens.current.set(id, token);

    return token;
  }, []);
};

export { useTokenCache };
