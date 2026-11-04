import { useEffect, useLayoutEffect, useRef } from "react";

interface PickWatch {
  readonly isPicking: boolean;
  readonly onPicked: (selector: string) => void;
  readonly onPicking: (isPicking: boolean) => void;
  readonly picked: string | null;
}

const usePickWatch = (watch: PickWatch): void => {
  const ref = useRef(watch);
  const startedWith = useRef<string | null>(null);
  const { isPicking, picked } = watch;

  useLayoutEffect(() => {
    ref.current = watch;
  });

  useEffect(() => {
    ref.current.onPicking(isPicking);
    startedWith.current = ref.current.picked;
  }, [isPicking]);

  useEffect(() => {
    if (isPicking && picked !== null && picked !== startedWith.current) {
      ref.current.onPicked(picked);
    }
  }, [isPicking, picked]);

  useEffect(
    () => (): void => {
      ref.current.onPicking(false);
    },
    []
  );
};

export { usePickWatch };

export type { PickWatch };
