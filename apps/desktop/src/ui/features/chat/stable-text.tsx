import type { ReactNode } from "react";

const StableText = ({
  children,
  sizes,
}: {
  children: ReactNode;
  sizes: readonly ReactNode[];
}) => (
  <span className="stable-text">
    <span>{children}</span>
    {sizes.map((size, index) => (
      <span key={index} className="stable-text-size" aria-hidden="true">
        {size}
      </span>
    ))}
  </span>
);

export { StableText };
