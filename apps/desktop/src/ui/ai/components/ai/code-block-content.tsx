import type { ReactElement, ReactNode } from "react";

interface CodeBlockContentProps {
  readonly children?: ReactNode;
}

const CodeBlockContent = ({
  children,
}: CodeBlockContentProps): ReactElement => (
  <div
    className="bg-surface-elevated ring ring-border rounded [&_pre]:text-sm font-mono relative"
    data-slot="code-block-content"
  >
    <div className="px-3 py-2">{children}</div>
  </div>
);

export { CodeBlockContent };
