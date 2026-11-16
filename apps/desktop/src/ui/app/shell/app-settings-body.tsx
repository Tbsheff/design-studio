import { Suspense } from "react";
import type { ReactElement } from "react";

import { IntegrationPanel } from "../../features/integration/index.js";
import { KeysPanel } from "../../features/settings/index.js";
import { AppConnectSection } from "./app-connect-section";
import { AppThemeField } from "./app-theme-field";

interface AppSettingsBodyProps {
  readonly onConnectAi: () => void;
}

const AppSettingsBody = ({
  onConnectAi,
}: AppSettingsBodyProps): ReactElement => (
  <div className="modal-body app-settings-body">
    <AppThemeField />
    <AppConnectSection onOpen={onConnectAi} />
    <Suspense fallback={null}>
      <IntegrationPanel />
      <KeysPanel />
    </Suspense>
  </div>
);

export { AppSettingsBody };
