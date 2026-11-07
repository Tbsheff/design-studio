import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { errorText } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import {
  readEffects,
  readStyles,
  saveStyle,
  writeEffects,
  writeStyle,
} from "./effect-api.js";
import type {
  EffectIds,
  EffectInfo,
  EffectItem,
  EffectStyle,
} from "./effect-types.js";

interface EffectState {
  readonly error: string | null;
  readonly info: EffectInfo | null;
  readonly stamp: string;
  readonly styles: readonly EffectStyle[];
}

interface Effects {
  readonly apply: (stack: readonly EffectItem[]) => void;
  readonly error: string | null;
  readonly handleSave: (name: string) => void;
  readonly handleStyle: (name: string | null) => void;
  readonly info: EffectInfo | null;
  readonly isPending: boolean;
  readonly styles: readonly EffectStyle[];
}

const EMPTY: EffectState = { error: null, info: null, stamp: "", styles: [] };

const toStamp = (
  ids: EffectIds,
  target: SelectionContext,
  round: number
): string => {
  const { source } = target;

  if (source === null) {
    return "";
  }

  return `${ids.projectId}/${ids.directionId}/${source.file}:${source.line}:${source.col}#${round}`;
};

const useEffectState = (
  ids: EffectIds,
  target: SelectionContext,
  round: number
): EffectState => {
  const [state, setState] = useState<EffectState>(EMPTY);
  const stamp = toStamp(ids, target, round);
  const { source } = target;

  useEffect(() => {
    if (source === null) {
      return;
    }

    const live = { current: true };

    const load = async (): Promise<void> => {
      try {
        const [info, styles] = await Promise.all([
          readEffects(ids, source),
          readStyles(ids),
        ]);

        if (live.current) {
          setState({ error: null, info, stamp, styles });
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
  }, [ids, source, stamp]);

  if (state.stamp === stamp) {
    return state;
  }

  return { ...EMPTY, info: state.info, styles: state.styles };
};

const useEffects = (ids: EffectIds, target: SelectionContext): Effects => {
  const [round, setRound] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const state = useEffectState(ids, target, round);

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
      run(() => writeEffects(ids, target, stack));
    },
    [ids, run, target]
  );

  const handleStyle = useCallback(
    (name: string | null): void => {
      run(() => writeStyle(ids, target, name));
    },
    [ids, run, target]
  );

  const stack = state.info?.effects;

  const handleSave = useCallback(
    (name: string): void => {
      run(() => saveStyle(ids, name, stack ?? []));
    },
    [ids, run, stack]
  );

  const error = saveError ?? state.error;
  const { info, styles } = state;

  return useMemo(
    () => ({ apply, error, handleSave, handleStyle, info, isPending, styles }),
    [apply, error, handleSave, handleStyle, info, isPending, styles]
  );
};

export { useEffects };

export type { Effects };
