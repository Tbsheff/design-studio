import type { ReactNode } from 'react';

export function StableText({ children, sizes }: { children: ReactNode; sizes: readonly ReactNode[] }) {
  return (
    <span className="stable-text">
      <span>{children}</span>
      {sizes.map((size, index) => (
        <span key={index} className="stable-text-size" aria-hidden="true">
          {size}
        </span>
      ))}
    </span>
  );
}
