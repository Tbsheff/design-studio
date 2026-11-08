import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";
import { useCallback, useEffect, useState } from "react";

import { errorText } from "../../api.js";
import { settle } from "./settle.js";
import { shareApi, sharesChanged } from "./share-api.js";
import type { ShareState } from "./share-types.js";
import { usePoll } from "./use-poll.js";

const POLL_MS = 3000;

const IDLE_SERVER: ShareServerState = {
  lan: false,
  lanUrl: null,
  localUrl: null,
  running: false,
};

const useShares = (projectId: string): ShareState => {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [server, setServer] = useState<ShareServerState>(IDLE_SERVER);
  const [error, setError] = useState<string | null>(null);
  const [activeCount, setActiveCount] = useState(0);

  const reload = useCallback(async () => {
    await settle(
      shareApi.list(projectId),
      (list) => {
        setLinks(list.links);
        setServer(list.server);
      },
      (failure) => setError(errorText(failure))
    );
  }, [projectId]);

  useEffect(() => {
    reload();
  }, [reload]);

  usePoll(
    links.some((link) => link.live && link.active),
    reload,
    POLL_MS
  );

  const act = useCallback(
    async (task: () => Promise<void>) => {
      setActiveCount((count) => count + 1);
      setError(null);

      let isDone = false;

      await settle(
        task(),
        () => {
          isDone = true;
        },
        (failure) => setError(errorText(failure))
      );

      if (isDone) {
        await reload();
        sharesChanged(projectId);
      }

      setActiveCount((count) => count - 1);
    },
    [reload, projectId]
  );

  const isBusy = activeCount > 0;

  return { act, error, isBusy, links, server };
};

export { useShares };
