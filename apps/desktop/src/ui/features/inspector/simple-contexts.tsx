import type { ElementSourceInfo } from "@design-studio/contracts";
import { useMemo } from "react";
import type { MutableRefObject, ReactElement, ReactNode } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { ColorPageContext } from "./use-color-page.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { VariantScopeContext } from "./use-edit-variant.js";
import type { VariantScope } from "./use-edit-variant.js";
import { DirectEditContext } from "./use-image-adjust.js";
import { InspectorAppContext, useInspectorApp } from "./use-inspector-app.js";
import { TokenUiContext } from "./use-token-snap.js";
import type { TokenUi } from "./use-token-snap.js";

interface SimpleContextsProps {
  readonly element: ElementSourceInfo | null;
  readonly variantScope: VariantScope;
  readonly tokenUi: TokenUi | null;
  readonly edit: DirectEdit;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly children: ReactNode;
}

const SimpleContexts = ({
  element,
  variantScope,
  tokenUi,
  edit,
  port,
  children,
}: SimpleContextsProps): ReactElement => {
  const app = useInspectorApp();

  const colored = (
    <ColorPageContext.Provider value={port}>
      {children}
    </ColorPageContext.Provider>
  );

  const scoped = (
    <DirectEditContext.Provider value={edit}>
      {colored}
    </DirectEditContext.Provider>
  );

  const value = useMemo(() => ({ ...app, element }), [app, element]);

  return (
    <InspectorAppContext.Provider value={value}>
      <VariantScopeContext.Provider value={variantScope}>
        <TokenUiContext.Provider value={tokenUi}>
          {scoped}
        </TokenUiContext.Provider>
      </VariantScopeContext.Provider>
    </InspectorAppContext.Provider>
  );
};

export { SimpleContexts };
