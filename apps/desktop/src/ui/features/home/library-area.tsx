import { Suspense } from "react";
import type { ReactElement, ReactNode } from "react";

import { ComposerAlert } from "./home-composer-parts.js";
import { HomeEmpty } from "./lazy-parts-model.js";

const LibraryArea = ({
  isEmpty,
  listError,
  onRetry,
  onUse,
  children,
}: {
  readonly isEmpty: boolean;
  readonly listError: string | null;
  readonly onRetry: () => void;
  readonly onUse: (path: string) => void;
  readonly children: ReactNode;
}): ReactElement => {
  if (isEmpty) {
    return (
      <Suspense fallback={null}>
        <HomeEmpty onUse={onUse} />
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
};

export { LibraryArea };
