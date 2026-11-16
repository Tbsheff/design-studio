import { useEffect, useTransition } from "react";

import { copy } from "./copy.js";
import type { Point } from "./prototype-model.js";
import { toValueOr } from "./settle-model.js";
import { STAGE_PASTE_EVENT, toStagePastePoint } from "./stage-menu-model.js";

const CLIPBOARD_FILE = "clipboard.png";

const IMAGE_TYPE = "image/";

const toImageFromClipboard = async (): Promise<File | null> => {
  const items = await toValueOr(navigator.clipboard.read(), []);

  const item = items.find((entry) =>
    entry.types.some((kind) => kind.startsWith(IMAGE_TYPE))
  );

  const type = item?.types.find((kind) => kind.startsWith(IMAGE_TYPE)) ?? null;

  if (!item || type === null) {
    return null;
  }

  const blob = await toValueOr(item.getType(type), null);

  if (blob === null) {
    return null;
  }

  return new File([blob], CLIPBOARD_FILE, { type });
};

interface PasteNotice {
  readonly current: { readonly notify: (message: string) => void };
}

const useStagePaste = (
  begin: (file: File, at: Point | null) => void,
  live: PasteNotice
): void => {
  const [, startPaste] = useTransition();

  useEffect(() => {
    const onStagePaste = (event: Event): void => {
      const at = toStagePastePoint(event);

      const paste = async (): Promise<void> => {
        const file = await toImageFromClipboard();

        if (file === null) {
          live.current.notify(copy.stagePasteEmpty);

          return;
        }

        begin(file, at);
      };

      startPaste(paste);
    };

    globalThis.addEventListener(STAGE_PASTE_EVENT, onStagePaste);

    return (): void => {
      globalThis.removeEventListener(STAGE_PASTE_EVENT, onStagePaste);
    };
  }, [begin, live]);
};

export { useStagePaste };
