import type { ReactElement, ReactNode } from "react";

interface StableSize {
  readonly key: string;
  readonly node: ReactNode;
}

const StableText = ({
  children,
  sizes,
}: {
  children: ReactNode;
  sizes: readonly StableSize[];
}): ReactElement => (
  <span className="stable-text">
    <span>{children}</span>
    {sizes.map((size) => (
      <span key={size.key} className="stable-text-size" aria-hidden="true">
        {size.node}
      </span>
    ))}
  </span>
);

export { StableText };

export type { StableSize };
