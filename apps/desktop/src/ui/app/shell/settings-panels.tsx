import type { ReactElement } from "react";

import { IntegrationPanel } from "../../features/integration/index.js";
import { KeysPanel } from "../../features/settings/index.js";

const SettingsPanels = (): ReactElement => (
  <>
    <IntegrationPanel />
    <KeysPanel />
  </>
);

export { SettingsPanels };
