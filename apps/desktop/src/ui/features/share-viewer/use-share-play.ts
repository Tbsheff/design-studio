import type { SharePlayData } from "@design-studio/contracts/share-play";
import { useEffect, useState } from "react";

import { getSharePlay } from "../../platform/share-play.js";

interface SharePlayState {
  readonly data: SharePlayData | null;
  readonly isMissing: boolean;
}

const LOADING: SharePlayState = { data: null, isMissing: false };

const useSharePlay = (): SharePlayState => {
  const [state, setState] = useState<SharePlayState>(LOADING);

  useEffect(() => {
    let isCurrent = true;

    const load = async (): Promise<void> => {
      const data = await getSharePlay();

      if (isCurrent) {
        setState({ data, isMissing: data === null });
      }
    };

    void load();

    return (): void => {
      isCurrent = false;
    };
  }, []);

  return state;
};

export { useSharePlay };

export type { SharePlayState };
