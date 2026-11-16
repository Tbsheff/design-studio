import { useCallback, useEffect, useState } from "react";

import { APP_SETTINGS_EVENT } from "../../domain/app-settings-events";

const useAppSettingsOpen = (): readonly [boolean, () => void] => {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback((): void => setIsOpen(false), []);

  useEffect(() => {
    const open = (): void => setIsOpen(true);

    globalThis.addEventListener(APP_SETTINGS_EVENT, open);

    return (): void => {
      globalThis.removeEventListener(APP_SETTINGS_EVENT, open);
    };
  }, []);

  return [isOpen, close];
};

export { useAppSettingsOpen };
