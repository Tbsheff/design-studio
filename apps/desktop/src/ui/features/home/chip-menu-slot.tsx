import { Suspense } from "react";
import type { RefObject, ReactElement } from "react";

import type { AppChip } from "./home-app-chip.js";
import { AppMenu } from "./lazy-parts.js";

const ChipMenuSlot = ({
  isShown,
  isClosing,
  chip,
  homeDir,
  chipRef,
  onClose,
  onChange,
  onTokensOnly,
}: {
  readonly isShown: boolean;
  readonly isClosing: boolean;
  readonly chip: AppChip | null;
  readonly homeDir: string | null;
  readonly chipRef: RefObject<HTMLDivElement | null>;
  readonly onClose: () => void;
  readonly onChange: (patch: Partial<AppChip>) => void;
  readonly onTokensOnly: () => void;
}): ReactElement | null => {
  if (!isShown || !chip) {
    return null;
  }

  const trigger = {
    current:
      chipRef.current?.querySelector<HTMLElement>(".home-chip-app") ?? null,
  };

  return (
    <Suspense fallback={null}>
      <AppMenu
        chip={chip}
        homeDir={homeDir}
        trigger={trigger}
        isClosing={isClosing}
        onClose={onClose}
        onChange={onChange}
        onTokensOnly={onTokensOnly}
      />
    </Suspense>
  );
};

export { ChipMenuSlot };
