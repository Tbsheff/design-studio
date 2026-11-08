import type { ReactElement, ReactNode } from "react";

interface CodeBlockProps {
  readonly children?: ReactNode;
}

const CodeBlock = ({ children }: CodeBlockProps): ReactElement => (
  <div
    className="group/code-block p-1 bg-surface rounded-outer ring ring-border flex flex-col gap-1 not-prose my-3"
    data-slot="code-block"
  >
    {children}
  </div>
);

export { CodeBlock };
