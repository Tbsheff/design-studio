import type { Starter } from "@design-studio/contracts";
import { type ReactNode, Suspense } from "react";

import { ComposerAlert } from "./home-composer-parts.js";
import { HomeEmpty } from "./lazy-parts.js";

function LibraryArea({
  isEmpty,
  isBusy,
  listError,
  onRetry,
  onUse,
  onSample,
  onStarter,
  children,
}: {
  readonly isEmpty: boolean;
  readonly isBusy: boolean;
  readonly listError: string | null;
  readonly onRetry: () => void;
  readonly onUse: (path: string) => void;
  readonly onSample: () => void;
  readonly onStarter: (starter: Starter) => void;
  readonly children: ReactNode;
}) {
  if (isEmpty) {
    return (
      <Suspense fallback={null}>
        <HomeEmpty
          isBusy={isBusy}
          onUse={onUse}
          onSample={onSample}
          onStarter={onStarter}
        />
      </Suspense>
    );
  }

  return (
    <>
      {children && <div className="home-library">{children}</div>}
      {!children && listError && (
        <ComposerAlert onClose={onRetry}>{listError}</ComposerAlert>
      )}
    </>
  );
}

export { LibraryArea };
