import { useEffect, useState } from "react";

import { SLASH_QUERY, slashQuery } from "./slash-menu-model.js";

interface ActiveRow {
  readonly at: number;
  readonly key: string;
}

interface SlashState {
  readonly active: ActiveRow | null;
  readonly dismissed: string | null;
  readonly open: boolean;
  readonly path: string | null;
  readonly query: string | null;
  readonly stash: string | null;
  readonly setActive: (active: ActiveRow | null) => void;
  readonly setDismissed: (dismissed: string | null) => void;
  readonly setPath: (path: string | null) => void;
  readonly setStash: (stash: string | null) => void;
}

const useSlashState = (draft: string): SlashState => {
  const [path, setPath] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveRow | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [stash, setStash] = useState<string | null>(null);
  const [seenDraft, setSeenDraft] = useState(draft);

  if (seenDraft !== draft) {
    setSeenDraft(draft);

    if (dismissed !== null && dismissed !== draft) {
      setDismissed(null);
    }
  }

  const query = slashQuery(draft, dismissed);
  const open = query !== null;

  return {
    active,
    dismissed,
    open,
    path,
    query,
    setActive,
    setDismissed,
    setPath,
    setStash,
    stash,
  };
};

const useSlashRestore = (
  state: SlashState,
  draft: string,
  setDraft: (value: string) => void
): void => {
  const { open, stash, setActive, setPath, setStash } = state;

  useEffect(() => {
    if (open) {
      return;
    }

    queueMicrotask(() => {
      setActive(null);
      setPath(null);

      if (stash === null) {
        return;
      }

      setStash(null);
      const rest = draft.replace(SLASH_QUERY, "");

      if (rest === "") {
        setDraft(stash);

        return;
      }

      setDraft(`${stash} ${rest}`);
    });
  }, [open, stash, draft, setDraft, setActive, setPath, setStash]);
};

export { useSlashRestore, useSlashState };

export type { ActiveRow, SlashState };
