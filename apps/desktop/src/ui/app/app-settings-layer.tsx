import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { APP_SETTINGS_EVENT } from "../domain/app-settings-events";

const AppSettingsDialog = lazy(async () => {
  const loaded = await import("./shell/app-settings-dialog");

  return { default: loaded.AppSettingsDialog };
});

interface AppSettingsLayerProps {
  readonly activeProjectId: string | null;
}

const AppSettingsLayer = ({
  activeProjectId,
}: AppSettingsLayerProps): ReactNode => {
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = useCallback((): void => setIsOpen(false), []);

  useEffect(() => {
    const handleOpen = (): void => setIsOpen(true);

    globalThis.addEventListener(APP_SETTINGS_EVENT, handleOpen);

    return (): void => {
      globalThis.removeEventListener(APP_SETTINGS_EVENT, handleOpen);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AppSettingsDialog
        hasProject={activeProjectId !== null}
        onClose={handleClose}
      />
    </Suspense>
  );
};

export { AppSettingsLayer };
