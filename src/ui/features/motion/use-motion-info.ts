import { useEffect, useMemo, useState } from "react";

import { api, insertError } from "./deps.js";
import type { MotionInfo, SelectionContext } from "./deps.js";

interface MotionIds {
  readonly directionId: string;
  readonly projectId: string;
}

type LoadResult =
  | { readonly status: "ready"; readonly info: MotionInfo }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" };

interface LoadKey {
  readonly ids: MotionIds;
  readonly round: number;
  readonly source: SelectionContext["source"];
}

interface Loaded {
  readonly key: LoadKey | null;
  readonly result: LoadResult;
}

interface MotionInfoState {
  readonly error: string | null;
  readonly info: MotionInfo | null;
  readonly loading: boolean;
}

interface Live {
  current: boolean;
}

const EMPTY: LoadResult = { status: "empty" };

const fetchInfo = async (key: LoadKey): Promise<LoadResult> => {
  if (!key.source) {
    return EMPTY;
  }

  try {
    const info = await api.listMotion(
      key.ids.projectId,
      key.ids.directionId,
      key.source
    );

    return { info, status: "ready" };
  } catch (error) {
    return { message: insertError(error), status: "error" };
  }
};

const infoOf = (result: LoadResult): MotionInfo | null => {
  if (result.status === "ready") {
    return result.info;
  }

  return null;
};

const errorOf = (result: LoadResult): string | null => {
  if (result.status === "error") {
    return result.message;
  }

  return null;
};

const useMotionInfo = (
  ids: MotionIds,
  target: SelectionContext,
  round: number
): MotionInfoState => {
  const { source } = target;

  const key = useMemo<LoadKey>(
    () => ({ ids, round, source }),
    [ids, round, source]
  );

  const [loaded, setLoaded] = useState<Loaded>({ key: null, result: EMPTY });

  useEffect(() => {
    const live: Live = { current: true };

    const load = async (): Promise<void> => {
      const result = await fetchInfo(key);

      if (live.current) {
        setLoaded({ key, result });
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [key]);

  return {
    error: errorOf(loaded.result),
    info: infoOf(loaded.result),
    loading: loaded.key !== key,
  };
};

export { useMotionInfo };

export type { MotionIds, MotionInfoState };
