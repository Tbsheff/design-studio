import { createContext } from "react";

import type {
  ComponentUsageSite,
  ComponentUsageView,
} from "./component-usage-model.js";

interface ComponentUsageLookup {
  readonly onOpenSite: (site: ComponentUsageSite) => void;
  readonly usageOf: (key: string) => ComponentUsageView | null;
}

const ComponentUsageContext = createContext<ComponentUsageLookup | null>(null);

export { ComponentUsageContext };

export type { ComponentUsageLookup };
