import { type RefObject, Suspense } from "react";

import type { AppChip } from "../../components/HomeAppChip.js";
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
  shown: boolean;
  closing: boolean;
  chip: AppChip | null;
  homeDir: string | null;
  chipRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onChange: (patch: Partial<AppChip>) => void;
  onTokensOnly: () => void;
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
