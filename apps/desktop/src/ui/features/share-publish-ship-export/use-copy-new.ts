import { shareUrl } from "@design-studio/contracts/share";
import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";
import { copyText } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";

import { pick } from "./pick.js";
import { settleValue } from "./settle.js";
import { sessionTokens } from "./share-tokens.js";
import type { ShareCopied } from "./share-types.js";

const toReadyToken = (
  pending: string | null,
  links: readonly ShareLink[],
  server: ShareServerState
): string | null => {
  if (!pending || !server.localUrl) {
    return null;
  }

  if (!links.some((link) => link.id === pending)) {
    return null;
  }

  return sessionTokens.get(pending) ?? null;
};

const useCopyNew = (
  links: readonly ShareLink[],
  server: ShareServerState
): ShareCopied => {
  const [pending, setPending] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);
  const started = useRef<string | null>(null);

  useEffect(() => {
    const token = toReadyToken(pending, links, server);

    if (!pending || !token || !server.localUrl || started.current === pending) {
      return;
    }

    started.current = pending;

    settleValue(copyText(shareUrl(server.localUrl, token)), (ok) => {
      setPending(null);
      setId(pick(ok, pending, null));
    });
  }, [pending, links, server]);

  return { id, made: setPending };
};

export { useCopyNew };
