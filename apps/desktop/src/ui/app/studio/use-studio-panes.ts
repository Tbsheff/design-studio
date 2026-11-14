import type {
  CommentPrefill,
  SelectionContext,
} from "@design-studio/contracts";
import { useEffect, useState } from "react";

import { loadAskChat } from "../../features/chat";
import { isDirectEditable } from "../../features/inspector";
import { ASK_CHAT_EVENT } from "../../platform/ask-chat";
import { focusComposerAtEnd } from "../../platform/focus";
import { isColumnTab } from "../../platform/panel-tab";
import { uiStore } from "../../platform/storage";
import { assignRef } from "./ref-model";
import type {
  ColumnTab,
  PanelTab,
  StudioPanes,
  StudioUi,
} from "./studio-ui-types";

const useAskChat = await loadAskChat();

const setColumn = (tab: ColumnTab, isOpen: boolean): void => {
  uiStore.set({ editorColumn: { isOpen, tab } });
};

const openColumn = (tab: ColumnTab): void => {
  const { editorColumn } = uiStore.get();

  if (editorColumn.isOpen && editorColumn.tab === tab) {
    setColumn(tab, false);

    return;
  }

  setColumn(tab, true);
};

const showColumn = (tab: ColumnTab): void => setColumn(tab, true);

const closeColumn = (): void => {
  setColumn(uiStore.get().editorColumn.tab, false);
};

const useSelectionReveal = (ui: StudioUi): void => {
  const { selection, isInspectorHidden, setIsInspectorHidden } = ui;
  const [seen, setSeen] = useState<SelectionContext[]>(selection);

  if (seen !== selection) {
    setSeen(selection);

    if (selection.length > 0 && isInspectorHidden) {
      setIsInspectorHidden(false);
    }
  }
};

const usePaneEvents = (
  ui: StudioUi,
  showPane: (tab: PanelTab) => Promise<boolean>
): void => {
  useEffect((): void => {
    assignRef(ui.prefillChat, async (next: CommentPrefill): Promise<void> => {
      const shown = await showPane("chat");

      if (shown) {
        ui.setPrefill({ ...next, seq: Date.now() });
      }
    });
  });

  useAskChat();

  useEffect((): (() => void) => {
    const listener = (): void => {
      globalThis.requestAnimationFrame(focusComposerAtEnd);
    };

    globalThis.addEventListener(ASK_CHAT_EVENT, listener);

    return (): void => globalThis.removeEventListener(ASK_CHAT_EVENT, listener);
  }, []);
};

const useStudioPanes = (ui: StudioUi): StudioPanes => {
  const { selection, source, compareOpen } = ui;
  const { setIsCommentsShown, setIsInspectorHidden } = ui;
  const editable = isDirectEditable(source, compareOpen);

  useSelectionReveal(ui);

  const isInspectorOpen =
    selection.length > 0 && !ui.isInspectorHidden && !ui.isCommentsShown;

  const showInspector = (): Promise<boolean> => {
    setIsInspectorHidden(false);
    setIsCommentsShown(false);

    return Promise.resolve(true);
  };

  const showComments = (isShown: boolean): Promise<boolean> => {
    setIsCommentsShown(isShown);

    return Promise.resolve(true);
  };

  const toggleInspector = (): void => {
    if (selection.length === 0) {
      return;
    }

    setIsCommentsShown(false);
    setIsInspectorHidden(isInspectorOpen);
  };

  const showPane = (tab: PanelTab): Promise<boolean> => {
    if (tab === "design") {
      return showInspector();
    }

    if (tab === "comments") {
      return showComments(true);
    }

    if (isColumnTab(tab)) {
      showColumn(tab);
    }

    return Promise.resolve(true);
  };

  usePaneEvents(ui, showPane);

  return {
    closeColumn,
    editable,
    isInspectorOpen,
    openColumn,
    showColumn,
    showComments,
    showInspector,
    showPane,
    toggleInspector,
  };
};

export { useStudioPanes };
