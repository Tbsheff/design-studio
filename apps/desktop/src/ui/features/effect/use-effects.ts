import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { errorText } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import { readEffects, writeEffects } from "./effect-api.js";
import type { EffectIds, EffectInfo, EffectItem } from "./effect-types.js";

interface EffectState {
  readonly error: string | null;
  readonly info: EffectInfo | null;
  readonly stamp: string;
}

interface Effects {
  readonly apply: (stack: readonly EffectItem[]) => void;
  readonly error: string | null;
  readonly info: EffectInfo | null;
  readonly isPending: boolean;
}

const EMPTY: EffectState = { error: null, info: null, stamp: "" };

interface EffectScope {
  readonly round: number;
  readonly variant: string;
}

const toStamp = (
  ids: EffectIds,
  target: SelectionContext,
  scope: EffectScope
): string => {
  const { source } = target;

  if (source === null) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}#${scope.round}|${scope.variant}`;
};

const useEffectState = (
  ids: EffectIds,
  target: SelectionContext,
  scope: EffectScope
): EffectState => {
  const [state, setState] = useState<EffectState>(EMPTY);
  const stamp = toStamp(ids, target, scope);
  const { variant } = scope;
  const { source } = target;

  useEffect(() => {
    if (source === null) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const info = await readEffects(ids, source, variant);

        if (live.current) {
          setState({ error: null, info, stamp });
        }
      } catch (error) {
        if (live.current) {
          setState({ ...EMPTY, error: errorText(error), stamp });
        }
      }
    };

    void load();

    return (): void => {
      live.current = false;
    };
  }, [ids, source, stamp, variant]);

  if (state.stamp === stamp) {
    return state;
  }

  return { ...EMPTY, info: state.info };
};

const useEffects = (
  ids: EffectIds,
  target: SelectionContext,
  variant: string
): Effects => {
  const [round, setRound] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scope = useMemo(() => ({ round, variant }), [round, variant]);
  const state = useEffectState(ids, target, scope);

  const run = useCallback((write: () => Promise<object>): void => {
    startTransition(async () => {
      try {
        await write();
        setSaveError(null);
      } catch (error) {
        setSaveError(errorText(error));
      }

      setRound((value) => value + 1);
    });
  }, []);

  const apply = useCallback(
    (stack: readonly EffectItem[]): void => {
      run(() => writeEffects(ids, target, { stack, variant }));
    },
    [ids, run, target, variant]
  );

  const error = saveError ?? state.error;
  const { info } = state;

  return useMemo(
    () => ({ apply, error, info, isPending }),
    [apply, error, info, isPending]
  );
};

export { useEffects };

export type { Effects };
