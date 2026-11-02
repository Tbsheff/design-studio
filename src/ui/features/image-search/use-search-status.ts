import { useCallback, useEffect, useMemo, useState } from "react";
import type { TransitionStartFunction } from "react";

import { copy } from "./copy.js";
import { insertError } from "./deps.js";
import { readStatus, writeSetting } from "./image-search-api.js";
import type { PhotoIds, SearchStatus } from "./image-search-api.js";

interface StatusSetup {
  readonly ids: PhotoIds;
  readonly setProblem: (message: string | null) => void;
  readonly startTransition: TransitionStartFunction;
}

interface StatusState {
  readonly handleSetting: (isOn: boolean) => void;
  readonly status: SearchStatus | null;
}

const useSearchStatus = (setup: StatusSetup): StatusState => {
  const { ids, setProblem, startTransition } = setup;
  const [status, setStatus] = useState<SearchStatus | null>(null);

  useEffect(() => {
    let isLive = true;

    const load = async (): Promise<void> => {
      const next = await readStatus(ids);

      if (isLive) {
        setStatus(next);
      }
    };

    void load();

    return (): void => {
      isLive = false;
    };
  }, [ids]);

  const handleSetting = useCallback(
    (isOn: boolean): void => {
      setProblem(null);
      startTransition(async () => {
        try {
          setStatus(await writeSetting(ids, isOn));
        } catch (error) {
          setProblem(insertError(error) || copy.settingFailed);
        }
      });
    },
    [ids, setProblem, startTransition]
  );

  return useMemo(() => ({ handleSetting, status }), [handleSetting, status]);
};

export { useSearchStatus };

export type { StatusState };
