import { useEffect, useState } from "react";

import { errorText } from "../api";
import { loadSession } from "../platform/session";

interface SessionState {
  error: string | null;
  ready: boolean;
}

const useSession = (): SessionState => {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const connect = async (): Promise<void> => {
      try {
        await loadSession();
        setReady(true);
      } catch (error) {
        setFailure(errorText(error));
      }
    };

    void connect();
  }, []);

  return { error: failure, ready };
};

export { useSession };
