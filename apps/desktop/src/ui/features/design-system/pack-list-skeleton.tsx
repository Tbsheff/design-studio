import type { ReactElement } from "react";

const PackListSkeleton = ({
  isShown,
}: {
  isShown: boolean;
}): ReactElement | null => {
  if (!isShown) {
    return null;
  }

  return <div className="pack-card skeleton" aria-hidden="true" />;
};

export { PackListSkeleton };
