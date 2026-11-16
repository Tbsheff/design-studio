import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { APP_SETTINGS_EVENT } from "../domain/app-settings-events";
import { CONNECT_AI_EVENT, openConnectAi } from "../domain/connect-ai-events";

type DialogName = "connect-ai" | "settings";

const ConnectAiDialog = lazy(async () => {
  const loaded = await import("../features/share-publish-ship-export");

  return { default: await loaded.loadConnectAiDialog() };
});

const AppSettingsDialog = lazy(async () => {
  const loaded = await import("./shell/app-settings-dialog");

  return { default: loaded.AppSettingsDialog };
});

interface DialogLayerProps {
  readonly activeProjectId: string | null;
}

const DialogLayer = ({ activeProjectId }: DialogLayerProps): ReactNode => {
  const [open, setOpen] = useState<DialogName | null>(null);
  const handleClose = useCallback((): void => setOpen(null), []);

  useEffect(() => {
    const openConnect = (): void => setOpen("connect-ai");
    const openSettings = (): void => setOpen("settings");

    globalThis.addEventListener(CONNECT_AI_EVENT, openConnect);
    globalThis.addEventListener(APP_SETTINGS_EVENT, openSettings);

    return (): void => {
      globalThis.removeEventListener(CONNECT_AI_EVENT, openConnect);
      globalThis.removeEventListener(APP_SETTINGS_EVENT, openSettings);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      {open === "connect-ai" && <ConnectAiDialog onClose={handleClose} />}
      {open === "settings" && (
        <AppSettingsDialog
          hasProject={activeProjectId !== null}
          onClose={handleClose}
          onConnectAi={openConnectAi}
        />
      )}
    </Suspense>
  );
};

export { DialogLayer };
