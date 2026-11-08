import type { ReactNode } from "react";

import { aliasPath, varTarget } from "./token-draft.js";
import { TokenValueSwatch } from "./token-value-swatch.js";

interface TokenAliasChipProps {
  readonly swatch: string | null;
  readonly value: string;
}

const TokenAliasChip = ({ swatch, value }: TokenAliasChipProps): ReactNode => {
  const target = aliasPath(value) ?? varTarget(value);

  if (!target) {
    return null;
  }

  return (
    <span className="tk-chip tkp-alias" data-tip={`Alias of ${target}`}>
      {swatch && <TokenValueSwatch paint={swatch} isSmall />}
      <span className="truncate">{target}</span>
    </span>
  );
};

export { TokenAliasChip };
