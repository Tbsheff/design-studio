import type { ReactNode } from "react";

import { TokenRenameField } from "./token-rename-field.js";
import { TokenRowMenu } from "./token-row-menu.js";
import { useTokenDelete } from "./use-token-delete.js";
import { useTokenRename } from "./use-token-rename.js";
import { useTokenUsageLookup } from "./use-token-usage.js";

interface TokenRowToolsProps {
  readonly name: string;
}

const TokenRowTools = ({ name }: TokenRowToolsProps): ReactNode => {
  const lookup = useTokenUsageLookup();
  const scope = lookup?.scope ?? null;
  const useCount = lookup?.usageOf(name)?.useCount ?? null;
  const rename = useTokenRename(name, scope);
  const handleDelete = useTokenDelete(name, scope);

  if (scope === null) {
    return null;
  }

  return (
    <>
      <TokenRowMenu
        name={name}
        onDelete={handleDelete}
        onRename={rename.handleStart}
        useCount={useCount}
      />
      {rename.isEditing && (
        <TokenRenameField name={name} rename={rename} useCount={useCount} />
      )}
    </>
  );
};

export { TokenRowTools };
