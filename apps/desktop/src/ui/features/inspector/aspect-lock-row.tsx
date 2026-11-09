import type { ReactElement } from "react";

import { AspectLockError } from "./aspect-lock-error.js";
import { AspectLockToggle } from "./aspect-lock-toggle.js";
import type { AspectLock } from "./use-aspect-lock.js";

const AspectLockRow = ({
  lock,
}: {
  readonly lock: AspectLock;
}): ReactElement => (
  <div className="wide">
    <AspectLockToggle
      isDisabled={!lock.isReady}
      isOn={lock.isOn}
      onToggle={lock.handleToggle}
    />
    <AspectLockError error={lock.error} />
  </div>
);

export { AspectLockRow };
