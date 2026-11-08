import type { Starter } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement } from "react";

const StarterPill = ({
  starter,
  isBusy,
  onStarter,
}: {
  readonly starter: Starter;
  readonly isBusy: boolean;
  readonly onStarter: (starter: Starter) => void;
}): ReactElement => {
  const handleStarter = useCallback((): void => {
    onStarter(starter);
  }, [onStarter, starter]);

  return (
    <button
      type="button"
      className="home-pill"
      disabled={isBusy}
      onClick={handleStarter}
    >
      {starter.name}
    </button>
  );
};

export { StarterPill };
