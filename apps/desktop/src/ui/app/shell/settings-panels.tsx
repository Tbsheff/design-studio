import { Suspense } from "react";
import type { ReactElement } from "react";

import { CompletionPanel } from "../../features/completion/index.js";

const SettingsPanels = (): ReactElement => (
  <Suspense fallback={null}>
    <CompletionPanel />
  </Suspense>
);

export { SettingsPanels };
