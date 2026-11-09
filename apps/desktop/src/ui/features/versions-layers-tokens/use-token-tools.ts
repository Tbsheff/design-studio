import { useTokenDelete } from "./use-token-delete.js";
import { useTokenRename } from "./use-token-rename.js";
import type { TokenRename } from "./use-token-rename.js";
import { useTokenUsageLookup } from "./use-token-usage.js";

interface TokenTools {
  readonly handleDelete: () => void;
  readonly hasScope: boolean;
  readonly rename: TokenRename;
  readonly useCount: number | null;
}

const useTokenTools = (name: string): TokenTools => {
  const lookup = useTokenUsageLookup();
  const scope = lookup?.scope ?? null;
  const useCount = lookup?.usageOf(name)?.useCount ?? null;
  const rename = useTokenRename(name, scope);
  const handleDelete = useTokenDelete(name, scope);

  const hasScope = scope !== null;

  return { handleDelete, hasScope, rename, useCount };
};

export { useTokenTools };

export type { TokenTools };
