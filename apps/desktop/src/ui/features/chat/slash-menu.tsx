import { useRef } from "react";
import type { ReactElement } from "react";
import { createPortal } from "react-dom";

import { useDocumentBody } from "../../platform/document-body.js";
import type {
  SlashGroup,
  SlashMenuView,
  SlashSection,
} from "./slash-menu-model.js";
import { SlashPanel } from "./slash-panel.js";
import { useDismissOutside } from "./use-dismiss-outside.js";
import { useSlashPlacement } from "./use-slash-placement.js";

const SlashMenu = ({
  view,
  anchor,
  input,
  onClose,
}: {
  view: SlashMenuView;
  anchor: () => HTMLElement | null;
  input: () => HTMLElement | null;
  onClose: () => void;
}): ReactElement | null => {
  const menu = useRef<HTMLDivElement>(null);
  const placement = useSlashPlacement(anchor);
  const body = useDocumentBody();
  useDismissOutside(input, menu, onClose);

  if (!body) {
    return null;
  }

  return (
    <>
      {createPortal(
        <SlashPanel panel={menu} placement={placement} view={view} />,
        body
      )}
    </>
  );
};

export { SlashMenu };

export type { SlashGroup, SlashMenuView, SlashSection };
