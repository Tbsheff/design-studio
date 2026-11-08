import type { ReactElement, ReactNode } from "react";

interface CodeBlockTitleProps {
  readonly children?: ReactNode;
}

const CodeBlockTitle = ({ children }: CodeBlockTitleProps): ReactElement => (
  <div
    className="text-xs font-medium text-muted-foreground"
    data-slot="code-block-title"
  >
    {children}
  </div>
);

export { CodeBlockTitle };
