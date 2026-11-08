import type { ElementSourceInfo } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactElement, ReactNode } from "react";

import { InspectorAppContext, useInspectorApp } from "./inspector-shared.js";
import { VariantScopeContext } from "./use-edit-variant.js";
import type { VariantScope } from "./use-edit-variant.js";
import { TokenUiContext } from "./use-token-snap.js";
import type { TokenUi } from "./use-token-snap.js";

interface SimpleContextsProps {
  readonly element: ElementSourceInfo | null;
  readonly variantScope: VariantScope;
  readonly tokenUi: TokenUi | null;
  readonly children: ReactNode;
}

const SimpleContexts = ({
  element,
  variantScope,
  tokenUi,
  children,
}: SimpleContextsProps): ReactElement => {
  const app = useInspectorApp();
  const value = useMemo(() => ({ ...app, element }), [app, element]);

  return (
    <InspectorAppContext.Provider value={value}>
      <VariantScopeContext.Provider value={variantScope}>
        <TokenUiContext.Provider value={tokenUi}>
          {children}
        </TokenUiContext.Provider>
      </VariantScopeContext.Provider>
    </InspectorAppContext.Provider>
  );
};

export { SimpleContexts };
