import type { ComponentInstance } from "@design-studio/contracts/props";
import { Suspense, lazy, useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PropsStatus } from "./props-model.js";

const SwapInstanceMenu = lazy(() => import("./swap-instance-menu.js"));

interface SwapButtonProps {
  readonly projectId: string;
  readonly directionId: string;
  readonly instance: ComponentInstance;
  readonly onStatus: (status: PropsStatus) => void;
}

interface SwapResult {
  readonly isOk: boolean;
  readonly text: string;
}

const toSwapStatus = (result: SwapResult): PropsStatus => {
  if (result.isOk) {
    return { kind: "saved", text: result.text };
  }

  return { kind: "error", text: result.text };
};

const SwapButton = ({
  projectId,
  directionId,
  instance,
  onStatus,
}: SwapButtonProps): ReactElement => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const onDone = useCallback(
    (result: SwapResult) => onStatus(toSwapStatus(result)),
    [onStatus]
  );

  return (
    <div className="prp-swap">
      <button
        type="button"
        className="btn small"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        data-tip={copy.changeThisUseToAnother}
        onClick={toggle}
      >
        {copy.swapInstance}
      </button>
      {isOpen && (
        <Suspense fallback={null}>
          <SwapInstanceMenu
            projectId={projectId}
            directionId={directionId}
            use={instance.use}
            onDone={onDone}
            onClose={close}
          />
        </Suspense>
      )}
    </div>
  );
};

export { SwapButton };
