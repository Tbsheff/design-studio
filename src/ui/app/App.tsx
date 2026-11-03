import type { ReactNode } from "react";

import { installRouting } from "../platform/router";
import { uiStore, useUi } from "../storage";
import { AppNotice } from "./app-notice";
import { AppScreen } from "./app-screen";
import { BootError } from "./boot-error";
import { BootMessage } from "./boot-message";
import { copy } from "./copy";
import { prefetchStudio } from "./screens";
import { useCommandLayer } from "./use-command-layer";
import { useSession } from "./use-session";

installRouting();

if (uiStore.get().activeProjectId) {
  void prefetchStudio();
}

const App = (): ReactNode => {
  const session = useSession();
  const ui = useUi();
  const [layer, onLayer] = useCommandLayer();

  if (session.error) {
    return (
      <BootError
        actionLabel={copy.retry}
        message={session.error}
        title={copy.connectFailedTitle}
      />
    );
  }

  if (!session.ready) {
    return <BootMessage>{copy.connecting}</BootMessage>;
  }

  return (
    <>
      <AppNotice
        activeProjectId={ui.activeProjectId}
        layer={layer}
        onLayer={onLayer}
      />
      <AppScreen />
    </>
  );
};

export { App };
