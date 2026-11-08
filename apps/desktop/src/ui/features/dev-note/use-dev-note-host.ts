import { useCallback, useMemo, useState } from "react";

import { copy } from "./copy.js";
import type { IconName, SelectionContext } from "./deps.js";
import {
  isSelectableLayer,
  toLayerId,
  toSourceText,
} from "./dev-note-model.js";
import type { DevNote } from "./dev-note-model.js";

interface SelectSourceMessage {
  readonly sourceLoc: string;
  readonly tag: string;
  readonly text: string;
  readonly type: "select-source";
}

interface DevNoteHostOptions {
  readonly enabled: boolean;
  readonly frameId: string;
  readonly frameName: string;
  readonly post: (message: SelectSourceMessage) => void;
  readonly projectId: string;
}

interface DevNoteMenuItem {
  readonly disabled?: string;
  readonly icon: IconName;
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface OpenedNote {
  readonly frameId: string;
  readonly frameName: string;
  readonly layerId: string | null;
  readonly layerName: string;
  readonly mode: "add" | "list";
  readonly projectId: string;
  readonly source: string | null;
}

interface DevNoteHost {
  readonly close: () => void;
  readonly items: (target: SelectionContext) => DevNoteMenuItem[];
  readonly opened: OpenedNote | null;
  readonly select: (note: DevNote) => void;
}

const toSelectMessage = (layerId: string): SelectSourceMessage => ({
  sourceLoc: layerId,
  tag: "",
  text: "",
  type: "select-source",
});

const useDevNoteHost = (options: DevNoteHostOptions): DevNoteHost => {
  const [opened, setOpened] = useState<OpenedNote | null>(null);
  const { enabled, frameId, frameName, post, projectId } = options;

  const close = useCallback((): void => setOpened(null), []);

  const select = useCallback(
    (note: DevNote): void => {
      if (isSelectableLayer(note.layerId)) {
        post(toSelectMessage(note.layerId));
      }
    },
    [post]
  );

  const items = useCallback(
    (target: SelectionContext): DevNoteMenuItem[] => {
      if (!enabled) {
        return [];
      }

      const base = { frameId, frameName, projectId };

      return [
        {
          icon: "edit",
          id: "add-dev-note",
          label: copy.add,
          run: (): void =>
            setOpened({
              ...base,
              layerId: toLayerId(target),
              layerName: target.tag,
              mode: "add",
              source: toSourceText(target),
            }),
        },
        {
          icon: "doc",
          id: "list-dev-note",
          label: copy.list,
          run: (): void =>
            setOpened({
              ...base,
              layerId: null,
              layerName: frameName,
              mode: "list",
              source: null,
            }),
        },
      ];
    },
    [enabled, frameId, frameName, projectId]
  );

  return useMemo(
    () => ({ close, items, opened, select }),
    [close, items, opened, select]
  );
};

export { useDevNoteHost };

export type {
  DevNoteHost,
  DevNoteHostOptions,
  DevNoteMenuItem,
  OpenedNote,
  SelectSourceMessage,
};
