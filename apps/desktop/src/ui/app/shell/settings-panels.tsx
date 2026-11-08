import { Suspense } from "react";
import type { ReactElement } from "react";

import { CompletionPanel } from "../../features/completion/index.js";
import { IntegrationPanel } from "../../features/integration/index.js";
import { KeysPanel } from "../../features/settings/index.js";
import { PublishSetup } from "../../features/share-publish-ship-export/index.js";

const SettingsPanels = (): ReactElement => (
  <Suspense fallback={null}>
    <PublishSetup />
    <IntegrationPanel />
    <KeysPanel>
      <CompletionPanel />
    </KeysPanel>
  </Suspense>
);

export { SettingsPanels };
