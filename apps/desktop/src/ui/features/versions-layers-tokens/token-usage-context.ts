import { createContext } from "react";

import type { TokenUsageView } from "./token-usage-model.js";

interface TokenUsageLookup {
  readonly onSelectSite: (selector: string) => void;
  readonly usageOf: (name: string) => TokenUsageView | null;
}

const TokenUsageContext = createContext<TokenUsageLookup | null>(null);

export { TokenUsageContext };

export type { TokenUsageLookup };
