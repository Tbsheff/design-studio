import type { ReactElement } from "react";

const ComponentsCount = ({
  count,
}: {
  count: number | null;
}): ReactElement | null => {
  if (count === null) {
    return null;
  }

  return <span className="count cmp-count">{count}</span>;
};

export { ComponentsCount };
