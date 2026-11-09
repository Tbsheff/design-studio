import { lazy, Suspense, useCallback } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { McpToasts } from "../features/chat";
import { CommandLayer } from "../features/commands";
import type { CommandLayerName, FileOpenTarget } from "../features/commands";
import { CodeEditHost, codeEditStore } from "../features/inspector";
import { isDesktop } from "../platform/desktop";

const DesktopApp = lazy(async () => {
  const loaded = await import("./shell/desktop-app");

  return { default: loaded.DesktopApp };
});

const FIRST_LINE = 1;

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
  const openFile = useCallback((target: FileOpenTarget): void => {
    codeEditStore.set({
      directionId: target.directionId,
      file: target.file,
      line: FIRST_LINE,
      projectId: target.projectId,
    });
  }, []);

  return (
    <>
      {layer && (
        <Suspense fallback={null}>
          <CommandLayer layer={layer} onLayer={onLayer} onOpenFile={openFile} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <CodeEditHost />
      </Suspense>
      <Suspense fallback={null}>
        <McpToasts />
      </Suspense>
      {isDesktop() && (
        <Suspense fallback={null}>
          <DesktopApp activeProjectId={activeProjectId} />
        </Suspense>
      )}
    </>
  );
};

export { AppNotice };
