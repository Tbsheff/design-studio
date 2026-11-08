import type { ElementSourceInfo } from "@design-studio/contracts";
import { createContext, useContext } from "react";

interface InspectorApp {
  readonly appDir: string | null;
  readonly ask: ((prompt: string) => void) | null;
  readonly element: ElementSourceInfo | null;
}

const InspectorAppContext = createContext<InspectorApp>({
  appDir: null,
  ask: null,
  element: null,
});

const useInspectorApp = (): InspectorApp => useContext(InspectorAppContext);

export { InspectorAppContext, useInspectorApp };

export type { InspectorApp };
