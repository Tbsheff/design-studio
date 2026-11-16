import { lazy, Suspense, useCallback, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { CommandLayer } from "../features/commands";
import type { CommandLayerName, FileOpenTarget } from "../features/commands";
import { isDesktop } from "../platform/desktop";
import { DialogLayer } from "./dialog-layer";

const DesktopApp = lazy(async () => {
  const loaded = await import("./shell/desktop-app");

  return { default: loaded.DesktopApp };
});

const McpToasts = lazy(async () => {
  const loaded = await import("../features/chat");

  return { default: await loaded.loadMcpToasts() };
});

const CodeEditHost = lazy(async () => {
  const loaded = await import("../features/inspector");

  return { default: await loaded.importCodeEditHost() };
});

const openCodeEdit = async (target: FileOpenTarget): Promise<void> => {
  const loaded = await import("../features/inspector");

  loaded.setCodeEditFile(target);
};

interface AppNoticeProps {
  activeProjectId: string | null;
  layer: CommandLayerName | null;
  onLayer: Dispatch<SetStateAction<CommandLayerName | null>>;
}

const AppNotice = ({
  activeProjectId,
  layer,
  onLayer,
}: AppNoticeProps): ReactNode => {
  const [isCodeEditUsed, setIsCodeEditUsed] = useState(
    activeProjectId !== null
  );

  if (activeProjectId !== null && !isCodeEditUsed) {
    setIsCodeEditUsed(true);
  }

  const openFile = useCallback((target: FileOpenTarget): void => {
    setIsCodeEditUsed(true);
    void openCodeEdit(target);
  }, []);

  return (
    <>
      {layer && (
        <Suspense fallback={null}>
          <CommandLayer layer={layer} onLayer={onLayer} onOpenFile={openFile} />
        </Suspense>
      )}
      {isCodeEditUsed && (
        <Suspense fallback={null}>
          <CodeEditHost />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <McpToasts />
      </Suspense>
      <DialogLayer activeProjectId={activeProjectId} />
      {isDesktop() && (
        <Suspense fallback={null}>
          <DesktopApp activeProjectId={activeProjectId} />
        </Suspense>
      )}
    </>
  );
};

export { AppNotice };
