import type {
  ShareLink,
  ShareServerState,
} from "@design-studio/contracts/share";

import { copy } from "./copy.js";
import { sessionTokens } from "./share-tokens.js";

const toOffNote = (
  links: readonly ShareLink[],
  server: ShareServerState
): string | null => {
  if (!links.some((link) => !link.active)) {
    return null;
  }

  if (server.running) {
    return copy.offNoteRunning;
  }

  return copy.offNoteStopped;
};

const toHiddenNote = (links: readonly ShareLink[]): string | null => {
  if (links.some((link) => link.active && !sessionTokens.has(link.id))) {
    return copy.hiddenLinkNote;
  }

  return null;
};

const toLinkNotes = (
  links: readonly ShareLink[],
  server: ShareServerState
): string[] => {
  const notes: string[] = [];
  const hidden = toHiddenNote(links);
  const off = toOffNote(links, server);

  if (hidden !== null) {
    notes.push(hidden);
  }

  if (off !== null) {
    notes.push(off);
  }

  return notes;
};

export { toLinkNotes };
