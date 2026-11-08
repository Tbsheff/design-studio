import { Suspense } from "react";
import type { ReactElement, RefObject } from "react";

import type { AppChip } from "./app-chip-model.js";
import { AppMenu } from "./lazy-parts-model.js";

const ChipMenuSlot = ({
  isShown,
  isClosing,
  chip,
  homeDir,
  triggerRef,
  onClose,
  onChange,
  onTokensOnly,
}: {
  readonly isShown: boolean;
  readonly isClosing: boolean;
  readonly chip: AppChip | null;
  readonly homeDir: string | null;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly onClose: () => void;
  readonly onChange: (patch: Partial<AppChip>) => void;
  readonly onTokensOnly: () => void;
}): ReactElement | null => {
  if (!isShown || !chip) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AppMenu
        chip={chip}
        homeDir={homeDir}
        trigger={triggerRef}
        isClosing={isClosing}
        onClose={onClose}
        onChange={onChange}
        onTokensOnly={onTokensOnly}
      />
    </Suspense>
  );
};

export { ChipMenuSlot };
