import type { ReactNode } from "react";

interface AliasRowProps {
  readonly text: string;
}

const AliasRow = ({ text }: AliasRowProps): ReactNode => (
  <p className="tkp-alias-row">{text}</p>
);

export { AliasRow };
