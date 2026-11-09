import { createContext } from "react";

import type { TokenUsageView } from "./token-usage-model.js";

interface TokenScope {
  readonly directionId: string;
  readonly projectId: string;
}

interface TokenUsageLookup {
  readonly onSelectSite: (selector: string) => void;
  readonly scope: TokenScope | null;
  readonly usageOf: (name: string) => TokenUsageView | null;
}

const TokenUsageContext = createContext<TokenUsageLookup | null>(null);

export { TokenUsageContext };

export type { TokenScope, TokenUsageLookup };
