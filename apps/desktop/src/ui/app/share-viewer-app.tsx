import { Suspense, useCallback } from "react";
import type { ReactElement, ReactNode } from "react";

import { PlayMode } from "../features/canvas/index.js";
import { ShareViewer } from "../features/share-viewer/index.js";
import type { SharePlayInput } from "../features/share-viewer/index.js";

const SHARE_PLAY_KEY = "share";

const toPlayTitle = (frame: { readonly label?: string }): string =>
  frame.label ?? "";

const restoreNothing = (): void => {
  globalThis.document.body.focus();
};

const ShareViewerApp = (): ReactElement => {
  const renderPlay = useCallback((input: SharePlayInput): ReactNode => {
    const { onClose } = input;

    return (
      <Suspense fallback={null}>
        <PlayMode
          kind="html"
          projectId={SHARE_PLAY_KEY}
          file={input.file}
          frames={input.frames}
          startId={input.startId}
          urlOf={input.urlOf}
          frameTitle={toPlayTitle}
          onClose={onClose}
          onRestoreFocus={restoreNothing}
          playComment={null}
          isFullBleed={input.isFullBleed}
        />
      </Suspense>
    );
  }, []);

  return (
    <Suspense fallback={null}>
      <ShareViewer renderPlay={renderPlay} />
    </Suspense>
  );
};

export { ShareViewerApp };
