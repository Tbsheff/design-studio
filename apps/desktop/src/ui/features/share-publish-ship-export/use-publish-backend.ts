import { useCallback, useEffect, useState } from "react";

import type {
  PublishBackendMode,
  PublishBackendState,
} from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { publishApi } from "./publish-api.js";
import { settle } from "./settle.js";

const POLL_MS = 1000;

interface PublishBackend {
  backend: PublishBackendState | null;
  error: string | null;
  load: (check?: boolean) => Promise<void>;
  setup: (mode: PublishBackendMode) => Promise<void>;
}

const usePublishBackend = (): PublishBackend => {
  const [backend, setBackend] = useState<PublishBackendState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (check = false) => {
    await settle(
      publishApi.backend(check),
      (next) => {
        setBackend(next);
        setError(null);
      },
      (failure) => setError(errorText(failure))
    );
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const isRunning = backend?.running === true;

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    let timer: ReturnType<typeof globalThis.setTimeout> | null = null;

    const tick = async (): Promise<void> => {
      await load();
      timer = globalThis.setTimeout(tick, POLL_MS);
    };

    timer = globalThis.setTimeout(tick, POLL_MS);

    return (): void => {
      if (timer !== null) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [isRunning, load]);

  const setup = useCallback(async (mode: PublishBackendMode) => {
    setError(null);

    await settle(
      publishApi.setup(mode),
      (next) => setBackend(next),
      (failure) => setError(errorText(failure))
    );
  }, []);

  return { backend, error, load, setup };
};

export { usePublishBackend };

export type { PublishBackend };
