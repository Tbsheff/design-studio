import { routes as shareRoutes } from "@design-studio/actions/share/routes";
import { copyText } from "@design-studio/ui";
import { useCallback, useMemo } from "react";

import { useLive } from "../../platform/live-store.js";
import { useAction } from "../../platform/query.js";
import { tokenStore } from "../../platform/share-tokens.js";
import { toFrameShareUrl, toShareLinkEntry } from "./frame-menu-model.js";
import type { ScreenEntry } from "./frame-menu-model.js";

const SHARE_PAGE = 50;

const NO_LINKS: readonly never[] = [];

const useFrameShareLink = (
  projectId: string,
  frameId: string
): ScreenEntry | null => {
  const tokens = useLive(tokenStore);
  const hasTokens = tokens.size > 0;
  let input = null;

  if (hasTokens) {
    input = { cursor: null, limit: SHARE_PAGE, projectId };
  }

  const list = useAction(shareRoutes.listShare, input);
  const links = list.data?.items ?? NO_LINKS;
  const localUrl = list.data?.server.localUrl ?? null;

  const url = useMemo(
    () => toFrameShareUrl({ frameId, links, localUrl, tokens }),
    [frameId, links, localUrl, tokens]
  );

  const run = useCallback((): void => {
    if (url !== null) {
      void copyText(url);
    }
  }, [url]);

  return useMemo(() => toShareLinkEntry(url, run), [run, url]);
};

export { useFrameShareLink };
