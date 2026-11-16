type FocusTarget = "advanced" | "prompt";

interface FocusRequest {
  readonly isAtEnd: boolean;
  readonly isHomeScrolled: boolean;
  readonly target: FocusTarget;
}

type FocusListener = (request: FocusRequest) => void;

const listeners = new Set<FocusListener>();

const setFocus = (
  target: FocusTarget,
  isAtEnd: boolean,
  isHomeScrolled: boolean
): void => {
  for (const listener of listeners) {
    listener({ isAtEnd, isHomeScrolled, target });
  }
};

const startFocusWatch = (listener: FocusListener): (() => void) => {
  listeners.add(listener);

  return (): void => {
    listeners.delete(listener);
  };
};

export { setFocus as focusRequest, startFocusWatch };

export type { FocusRequest, FocusTarget };
