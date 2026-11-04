import { type ReactNode, Suspense } from "react";

import type { Starter } from "@design-studio/actions/_core/contracts";
import { ComposerAlert } from "./home-composer-parts.js";
import { HomeEmpty } from "./lazy-parts.js";

function LibraryArea({
  empty,
  busy,
  listError,
  onRetry,
  onUse,
  onSample,
  onStarter,
  children,
}: {
  empty: boolean;
  busy: boolean;
  listError: string | null;
  onRetry: () => void;
  onUse: (path: string) => void;
  onSample: () => void;
  onStarter: (starter: Starter) => void;
  children: ReactNode;
}) {
  if (empty) {
    return (
      <Suspense fallback={null}>
        <HomeEmpty
          busy={busy}
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
