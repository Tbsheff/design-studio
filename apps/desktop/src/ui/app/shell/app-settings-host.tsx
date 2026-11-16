import type { ReactElement } from "react";

import { openConnectAi } from "../../domain/connect-ai-events";
import { AppSettingsDialog } from "./app-settings-dialog";
import { useAppSettingsOpen } from "./use-app-settings-open";

const AppSettingsHost = (): ReactElement | null => {
  const [isOpen, close] = useAppSettingsOpen();

  if (!isOpen) {
    return null;
  }

  return <AppSettingsDialog onClose={close} onConnectAi={openConnectAi} />;
};

export { AppSettingsHost };
