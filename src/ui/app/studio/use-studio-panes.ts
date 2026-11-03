import { useEffect } from "react";

import type { CommentPrefill } from "../../../shared/contracts";
import {
  isDirectEditable,
  inspectorEmptyReason,
} from "../../components/Inspector";
import { uiStore } from "../../storage";
import { usePanelTab } from "../../usePanelTab";
import { assignRef } from "./ref-model";
import type { PanelTab, StudioPanes, StudioUi } from "./studio-ui-types";

const useStudioPanes = (projectId: string, ui: StudioUi): StudioPanes => {
  const { selection, source, compareOpen, paneCollapsed, editSession } = ui;
  const editable = isDirectEditable(source, compareOpen);

  const panel = usePanelTab(
    projectId,
    inspectorEmptyReason(selection, editable) === null
  );

  const showPane = async (tab: PanelTab): Promise<boolean> => {
    if (paneCollapsed) {
      uiStore.set({ paneCollapsed: false });
    }

    const session = editSession.current;

    if (
      panel.tab === "design" &&
      tab !== "design" &&
      session &&
      !(await session.requestExit())
    ) {
      return false;
    }

    panel.choose(tab);

    return true;
  };

  const canvasPane = (tab: PanelTab): Promise<boolean> => {
    if (panel.tab === "design" && tab === "comments") {
      return Promise.resolve(true);
    }

    return showPane(tab);
  };

  useEffect((): void => {
    assignRef(ui.prefillChat, async (next: CommentPrefill): Promise<void> => {
      const shown = await showPane("chat");

      if (shown) {
        ui.setPrefill({ ...next, seq: Date.now() });
      }
    });
  });

  return { canvasPane, editable, panel, showPane };
};

export { useStudioPanes };
