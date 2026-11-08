import { useCallback, useState } from "react";

interface Keyed<Value> {
  readonly key: string | null;
  readonly value: Value;
}

interface KeyedState<Value> {
  readonly value: Value;
  readonly set: (next: Value) => void;
  readonly update: (change: (previous: Value) => Value) => void;
}

const toKeyedValue = <Value>(
  state: Keyed<Value> | null,
  key: string | null,
  initial: Value
): Value => {
  if (state !== null && state.key === key) {
    return state.value;
  }

  return initial;
};

const useKeyedState = <Value>(
  key: string | null,
  initial: Value
): KeyedState<Value> => {
  const [state, setState] = useState<Keyed<Value> | null>(null);

  const set = useCallback(
    (next: Value): void => setState({ key, value: next }),
    [key]
  );

  const update = useCallback(
    (change: (previous: Value) => Value): void =>
      setState((previous) => ({
        key,
        value: change(toKeyedValue(previous, key, initial)),
      })),
    [key, initial]
  );

  return { set, update, value: toKeyedValue(state, key, initial) };
};

export { useKeyedState };

export type { KeyedState };
