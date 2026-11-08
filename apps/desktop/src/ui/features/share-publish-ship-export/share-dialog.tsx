import { shareUrl } from "@design-studio/contracts/share";
import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";
import { copyText, useModalDialog } from "@design-studio/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import type { PublishKind } from "../../../shared/publish.js";
import { errorText } from "../../api.js";
import { canvasFrameName, framePage } from "../canvas/index.js";
import { copy } from "./copy.js";
import { canvasFrameChoices } from "./export-api.js";
import { toFrameLabels } from "./frame-labels.js";
import { pick } from "./pick.js";
import { PublishPane } from "./publish-pane.js";

import "../../styles/export.css";
import "../../styles/share.css";
import { catchFailure, ignoreFailure, settleValue } from "./settle.js";
import { shareApi, sharesChanged } from "./share-api.js";
import { ShareHead } from "./share-head.js";
import { ShareLinkForm } from "./share-link-form.js";
import type { ShareMode } from "./share-mode.js";
import { ShareTabs } from "./share-tabs.js";
import { sessionTokens } from "./share-tokens.js";
import type { ShareCopied, ShareState } from "./share-types.js";

export interface ShareTarget {
  projectId: string;
  directionId: string | null;
  versionId: string | null;
  kind: PublishKind;
  mode?: ShareMode;
}

const FRAME_NAMERS = { nameOf: canvasFrameName, pageOf: framePage };

const POLL_MS = 3000;

const useShares = (projectId: string): ShareState => {
  const [links, setLinks] = useState<ShareLink[]>([]);

  const [server, setServer] = useState<ShareServerState>({
    lan: false,
    lanUrl: null,
    localUrl: null,
    running: false,
  });

  const [failure, setFailure] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const reload = useCallback(async () => {
    const list = await shareApi.list(projectId);
    setLinks(list.links);
    setServer(list.server);
  }, [projectId]);

  useEffect(() => {
    void catchFailure(reload(), (loadFailure) =>
      setFailure(errorText(loadFailure))
    );
  }, [reload]);
  const watching = links.some((link) => link.live && link.active);
  useEffect(() => {
    if (!watching) {
      return;
    }

    const timer = globalThis.setInterval(
      () => void ignoreFailure(reload()),
      POLL_MS
    );

    return () => globalThis.clearInterval(timer);
  }, [watching, reload]);

  const act = useCallback(
    async (task: () => Promise<void>) => {
      setIsBusy(true);
      setFailure(null);

      try {
        await task();
        await reload();
        sharesChanged(projectId);
      } catch (error) {
        setFailure(errorText(error));
      } finally {
        setIsBusy(false);
      }
    },
    [reload, projectId]
  );

  return { act, error: failure, isBusy, links, server };
};

const useCopyNew = (
  links: readonly ShareLink[],
  server: ShareServerState
): ShareCopied => {
  const [pending, setPending] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const token = pending ? sessionTokens.get(pending) : null;

    if (
      !pending ||
      !token ||
      !server.localUrl ||
      !links.some((link) => link.id === pending)
    ) {
      return;
    }

    setPending(null);
    document
      .querySelector<HTMLElement>(`[data-link-id="${pending}"] .copy-btn`)
      ?.focus();
    void settleValue(copyText(shareUrl(server.localUrl, token)), (ok) =>
      setId(pick(ok, pending, null))
    );
  }, [pending, links, server.localUrl]);

  return { id, made: setPending };
};

interface LinkShareProps {
  readonly target: ShareTarget;
  readonly tabs: ReactNode;
  readonly onClose: () => void;
}

const LinkShare = ({ onClose, tabs, target }: LinkShareProps): ReactElement => {
  const shares = useShares(target.projectId);
  const copied = useCopyNew(shares.links, shares.server);

  const labels = useMemo(
    () =>
      toFrameLabels(
        target.projectId,
        canvasFrameChoices(target.projectId, target.directionId),
        FRAME_NAMERS
      ),
    [target.projectId, target.directionId]
  );

  return (
    <ShareLinkForm
      target={target}
      shares={shares}
      copied={copied}
      labels={labels}
      tabs={tabs}
      onClose={onClose}
    />
  );
};

interface ShareDialogProps {
  readonly target: ShareTarget;
  readonly onClose: () => void;
}

const ShareDialog = ({ onClose, target }: ShareDialogProps): ReactElement => {
  const dialog = useModalDialog(onClose);
  const [mode, setMode] = useState<ShareMode>(target.mode ?? "link");
  const tabs = <ShareTabs mode={mode} onMode={setMode} />;
  const isLink = mode === "link";

  return (
    <dialog
      ref={dialog.ref}
      className="modal share-dialog"
      aria-label={pick(isLink, copy.shareLinkAria, copy.publishAria)}
      onMouseDown={dialog.onMouseDown}
    >
      {isLink && <LinkShare target={target} onClose={onClose} tabs={tabs} />}
      {!isLink && (
        <>
          <ShareHead
            title={copy.publishOnCloudflare}
            subtitle={copy.putASavedVersion}
            tabs={tabs}
            onClose={onClose}
          />
          <PublishPane target={target} onClose={onClose} />
        </>
      )}
    </dialog>
  );
};

export { ShareDialog };

export type { ShareDialogProps };
