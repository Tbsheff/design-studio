import { useEffect, useState } from "react";

import { errorText } from "../api";
import { loadSession } from "../platform/session";
import { uiStore } from "../platform/storage";
import { prefetchHome, prefetchStudio } from "./screen-preload";

interface SessionState {
  error: string | null;
  ready: boolean;
}

const prefetchFirstScreen = (): Promise<boolean> => {
  const ui = uiStore.get();

  if (ui.activeProjectId) {
    return prefetchStudio();
  }

  if (ui.screen === "home") {
    return prefetchHome();
  }

  return Promise.resolve(false);
};

const useSession = (): SessionState => {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const connect = async (): Promise<void> => {
      try {
        await Promise.all([loadSession(), prefetchFirstScreen()]);
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
