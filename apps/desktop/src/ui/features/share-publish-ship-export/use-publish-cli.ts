import { useCallback, useEffect, useState, useTransition } from "react";

import type { PublishCliState } from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { publishApi } from "./publish-api.js";
import { settle } from "./settle.js";

interface PublishCli {
  busy: boolean;
  cli: PublishCliState | null;
  error: string | null;
  run: (task: () => Promise<PublishCliState>) => void;
}

const usePublishCli = (): PublishCli => {
  const [cli, setCli] = useState<PublishCliState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback((task: () => Promise<PublishCliState>) => {
    startTransition(async () => {
      setError(null);

      await settle(
        task(),
        (next) => setCli(next),
        (failure) => setError(errorText(failure))
      );
    });
  }, []);

  useEffect(() => {
    run(() => publishApi.cli());
  }, [run]);

  const isWaiting = cli?.login.running === true;

  useEffect(() => {
    if (!isWaiting) {
      return;
    }

    const refresh = (): void => {
      run(() => publishApi.cli());
    };

    globalThis.addEventListener("focus", refresh);

    return (): void => globalThis.removeEventListener("focus", refresh);
  }, [isWaiting, run]);

  return { busy: isPending, cli, error, run };
};

export { usePublishCli };

export type { PublishCli };
