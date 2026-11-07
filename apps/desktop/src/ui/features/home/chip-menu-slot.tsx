import { type RefObject, Suspense } from "react";

import type { AppChip } from "./home-app-chip.js";
import { AppMenu } from "./lazy-parts.js";

function ChipMenuSlot({
  shown,
  closing,
  chip,
  homeDir,
  chipRef,
  onClose,
  onChange,
  onTokensOnly,
}: {
  readonly shown: boolean;
  readonly closing: boolean;
  readonly chip: AppChip | null;
  readonly homeDir: string | null;
  readonly chipRef: RefObject<HTMLDivElement | null>;
  readonly onClose: () => void;
  readonly onChange: (patch: Partial<AppChip>) => void;
  readonly onTokensOnly: () => void;
}) {
  if (!shown || !chip) {
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
        closing={closing}
        onClose={onClose}
        onChange={onChange}
        onTokensOnly={onTokensOnly}
      />
    </Suspense>
  );
}

export { ChipMenuSlot };
