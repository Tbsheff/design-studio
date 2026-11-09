import type { ReactNode } from "react";

import { TokenRenameField } from "./token-rename-field.js";
import { TokenRowLine } from "./token-row-line.js";
import type { TokenRowProps } from "./token-row-types.js";
import { useTokenTools } from "./use-token-tools.js";

interface TokenRowHeadProps {
  readonly isChanged: boolean;
  readonly row: TokenRowProps;
  readonly swatch: string | null;
}

const TokenRowHead = ({
  isChanged,
  row,
  swatch,
}: TokenRowHeadProps): ReactNode => {
  const tools = useTokenTools(row.entry.cssVar);

  return (
    <>
      <TokenRowLine
        isChanged={isChanged}
        row={row}
        swatch={swatch}
        tools={tools}
      />
      {tools.rename.isEditing && (
        <TokenRenameField
          name={row.entry.cssVar}
          rename={tools.rename}
          useCount={tools.useCount}
        />
      )}
    </>
  );
};

export { TokenRowHead };
