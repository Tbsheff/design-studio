import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { CONNECT_AI_EVENT } from "../domain/connect-ai-events";

const ConnectAiDialog = lazy(async () => {
  const loaded = await import("../features/share-publish-ship-export");

  return { default: await loaded.loadConnectAiDialog() };
});

const ConnectAiLayer = (): ReactNode => {
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = useCallback((): void => setIsOpen(false), []);

  useEffect(() => {
    const handleOpen = (): void => setIsOpen(true);

    globalThis.addEventListener(CONNECT_AI_EVENT, handleOpen);

    return (): void => {
      globalThis.removeEventListener(CONNECT_AI_EVENT, handleOpen);
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <ConnectAiDialog onClose={handleClose} />
    </Suspense>
  );
};

export { ConnectAiLayer };
