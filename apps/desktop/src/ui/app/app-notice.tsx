import { lazy, Suspense } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import { McpToasts } from "../features/chat";
import { CommandLayer } from "../features/commands";
import type { CommandLayerName } from "../features/commands";
import { isDesktop } from "../platform/desktop";

const DesktopApp = lazy(() => import("./shell/desktop-app"));

interface AppNoticeProps {
  activeProjectId: string | null;
  layer: CommandLayerName | null;
  onLayer: Dispatch<SetStateAction<CommandLayerName | null>>;
}

const AppNotice = ({
  activeProjectId,
  layer,
  onLayer,
}: AppNoticeProps): ReactNode => (
  <>
    {layer && (
      <Suspense fallback={null}>
        <CommandLayer layer={layer} onLayer={onLayer} />
      </Suspense>
    )}
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

export { AppNotice };
