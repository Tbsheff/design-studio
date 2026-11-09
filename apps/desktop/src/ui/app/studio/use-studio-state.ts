import type {
  CommentPrefill,
  SelectionContext,
  Version,
} from "@design-studio/contracts";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";

import { errorText } from "../../api";
import type { CanvasSource } from "../../domain/canvas-presets.js";
import type { MentionRequest } from "../../features/chat/use-mentions";
import type { PrefillRequest } from "../../features/comments";
import { useRail } from "../../features/home/index.js";
import type { InspectorTab } from "../../features/inspector/inspector";
import type { DirectEditControl } from "../../features/inspector/use-direct-edit";
import type { EditSessionHandle } from "../../features/inspector/use-edit-session";
import type { ShareTarget } from "../../features/share-publish-ship-export/share-dialog";
import type { PreviewPort } from "../../platform/bridge";
import {
  createDraftStore,
  useDraftActive,
  useUi,
} from "../../platform/storage";
import type { DraftStore } from "../../platform/storage";
import type {
  StudioActing,
  StudioLayout,
  StudioOpen,
  StudioRefs,
  StudioUi,
} from "./studio-ui-types";

const noop = (): null => null;

const runAct = async <Result>(
  setActionError: (message: string | null) => void,
  fn: () => Promise<Result>
): Promise<void> => {
  setActionError(null);

  try {
    await fn();
  } catch (error) {
    setActionError(errorText(error));
  }
};

const useStudioRefs = (): StudioRefs => ({
  columnsRef: useRef<HTMLDivElement>(null),
  editControl: useRef<DirectEditControl | null>(null),
  editSession: useRef<EditSessionHandle | null>(null),
  port: useRef<PreviewPort | null>(null),
  prefillChat: useRef<(next: CommentPrefill) => void>(noop),
  undoRef: useRef<() => void>(noop),
});

const useStudioOpen = (): StudioOpen => {
  const [compare, setCompare] = useState<Version[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [detailsRunId, setDetailsRunId] = useState<string | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);

  return {
    compare,
    compareOpen,
    designOpen,
    detailsRunId,
    setCompare,
    setCompareOpen,
    setDesignOpen,
    setDetailsRunId,
    setSettingsOpen,
    setShareTarget,
    setShipOpen,
    settingsOpen,
    shareTarget,
    shipOpen,
  };
};

const useStudioLayout = (): StudioLayout => {
  const [topStart, setTopStart] = useState<HTMLDivElement | null>(null);
  const [topCenter, setTopCenter] = useState<HTMLDivElement | null>(null);
  const [topEnd, setTopEnd] = useState<HTMLDivElement | null>(null);
  const [pagesHost, setPagesHost] = useState<HTMLDivElement | null>(null);
  const [isInspectorHidden, setIsInspectorHidden] = useState(false);
  const [isCommentsShown, setIsCommentsShown] = useState(false);
  const { editorColumn } = useUi();

  return {
    editorColumn,
    isCommentsShown,
    isInspectorHidden,
    pagesHost,
    setIsCommentsShown,
    setIsInspectorHidden,
    setPagesHost,
    setTopCenter,
    setTopEnd,
    setTopStart,
    topCenter,
    topEnd,
    topStart,
  };
};

const useStudioAct = (): StudioActing => {
  const [busy, startAct] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const act = useCallback(
    async <Result>(fn: () => Promise<Result>): Promise<void> => {
      const run = runAct(setActionError, fn);

      startAct(() => run);
      await run;
    },
    []
  );

  return { act, actionError, busy, setActionError };
};

const useStudioState = (): StudioUi => {
  const refs = useStudioRefs();
  const open = useStudioOpen();
  const acting = useStudioAct();
  const layout = useStudioLayout();
  const [selection, setSelection] = useState<SelectionContext[]>([]);
  const draft = useMemo((): DraftStore => createDraftStore(), []);
  const composerActive = useDraftActive(draft);
  const [source, setSource] = useState<CanvasSource>({ kind: "live" });
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const { chatWidth } = useUi();
  const [layersHost, setLayersHost] = useState<HTMLDivElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("simple");
  const [prefill, setPrefill] = useState<PrefillRequest | null>(null);

  const [mentionRequest, setMentionRequest] = useState<MentionRequest | null>(
    null
  );

  const rail = useRail();

  return {
    ...refs,
    ...open,
    ...acting,
    ...layout,
    chatWidth,
    composerActive,
    draft,
    inspectorTab,
    layersHost,
    mentionRequest,
    prefill,
    rail,
    selection,
    setInspectorTab,
    setLayersHost,
    setMentionRequest,
    setPrefill,
    setSelection,
    setSource,
    setStaleNotice,
    source,
    staleNotice,
  };
};

export { useStudioState };
