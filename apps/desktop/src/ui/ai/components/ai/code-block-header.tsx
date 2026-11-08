import type { ReactElement, ReactNode } from "react";

interface CodeBlockHeaderProps {
  readonly children?: ReactNode;
}

const CodeBlockHeader = ({ children }: CodeBlockHeaderProps): ReactElement => (
  <header
    className="px-3 h-8 flex items-center code-block-head"
    data-slot="code-block-header"
  >
    {children}
  </header>
);

export { CodeBlockHeader };
