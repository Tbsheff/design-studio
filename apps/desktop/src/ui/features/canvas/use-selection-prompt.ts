import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

import {
  moveSelectionPromptToChat,
  onSelectionPromptOpen,
  selectionRun,
  sendSelectionPrompt,
  toPromptBounds,
} from "../../platform/ask-chat.js";
import { useNow } from "../../platform/clock.js";
import { useLive } from "../../platform/live-store.js";
import { useLatest } from "../../platform/use-latest.js";
import { copy } from "./copy.js";
import {
  BELOW,
  CLOSED,
  OPEN,
  isRunOver,
  toElapsedSeconds,
  toPlacement,
  toSelectionLabel,
  toClippedRect,
  toStartedPhase,
  toUnionRect,
  toWorkingPhase,
} from "./selection-prompt-model.js";
import type {
  PromptBounds,
  PromptPhase,
  PromptPlacement,
  PromptRect,
} from "./selection-prompt-model.js";

const TICK_MS = 1000;

interface SelectionPromptView {
  readonly elapsed: number;
  readonly isRunning: boolean;
  readonly label: string;
  readonly onChat: () => void;
  readonly onClose: () => void;
  readonly onOpen: () => void;
  readonly onSubmit: () => void;
  readonly onText: (text: string) => void;
  readonly phase: PromptPhase;
  readonly place: (node: HTMLElement | null) => void;
  readonly placement: PromptPlacement;
  readonly rect: PromptRect | null;
  readonly text: string;
}

interface PromptPlace {
  readonly place: (node: HTMLElement | null) => void;
  readonly placement: PromptPlacement;
  readonly resetPlacement: () => void;
}

interface PromptPhaseState {
  readonly elapsed: number;
  readonly isRunning: boolean;
  readonly phase: PromptPhase;
  readonly setPhase: Dispatch<SetStateAction<PromptPhase>>;
}

const restoreFocus = (previous: RefObject<Element | null>): void => {
  const { current } = previous;

  if (current instanceof HTMLElement && current.isConnected) {
    current.focus({ preventScroll: true });
  }
};

const usePromptPlace = (zoom: number): PromptPlace => {
  const [placement, setPlacement] = useState<PromptPlacement>(BELOW);
  const latestZoom = useLatest(zoom);

  const place = useCallback(
    (node: HTMLElement | null): void => {
      if (!node) {
        return;
      }

      const box = node.getBoundingClientRect();
      const bounds = toPromptBounds();

      setPlacement((previous) =>
        toPlacement(box, bounds, latestZoom.current, previous)
      );
    },
    [latestZoom]
  );

  const resetPlacement = useCallback((): void => setPlacement(BELOW), []);

  return { place, placement, resetPlacement };
};

const usePromptPhase = (
  selection: readonly SelectionContext[]
): PromptPhaseState => {
  const [phase, setPhase] = useState<PromptPhase>(CLOSED);
  const isRunning = useLive(selectionRun);
  const now = useNow(phase.kind === "working", TICK_MS);
  const started = toStartedPhase(phase, isRunning);

  if (started !== phase) {
    setPhase(started);
  }

  if (isRunOver(phase, isRunning, now)) {
    setPhase(CLOSED);
  }

  if (phase.kind === "open" && selection.length === 0) {
    setPhase(CLOSED);
  }

  let elapsed = 0;

  if (phase.kind === "working") {
    elapsed = toElapsedSeconds(phase.sentAt, now);
  }

  return { elapsed, isRunning, phase, setPhase };
};

const useSelectionPrompt = (
  selection: readonly SelectionContext[],
  zoom: number,
  bounds: PromptBounds
): SelectionPromptView => {
  const [text, setText] = useState("");
  const returnTo = useRef<Element | null>(null);
  const { elapsed, isRunning, phase, setPhase } = usePromptPhase(selection);
  const { place, placement, resetPlacement } = usePromptPlace(zoom);
  const label = toSelectionLabel(selection, copy.selectionPrompt.elements);
  const latest = useLatest({ isRunning, label, selection, text });

  const onOpen = useCallback((): void => {
    if (latest.current.selection.length > 0) {
      returnTo.current = document.activeElement;
      resetPlacement();
      setPhase(OPEN);
    }
  }, [latest, resetPlacement, setPhase]);

  const onClose = useCallback((): void => {
    setPhase(CLOSED);
    setText("");
    restoreFocus(returnTo);
  }, [setPhase]);

  const onSubmit = useCallback((): void => {
    const { current } = latest;
    const prompt = current.text.trim();

    if (prompt && !current.isRunning && current.selection.length > 0) {
      sendSelectionPrompt(prompt);
      setText("");
      setPhase(toWorkingPhase(current.label, Date.now()));
      restoreFocus(returnTo);
    }
  }, [latest, setPhase]);

  const onChat = useCallback((): void => {
    moveSelectionPromptToChat(latest.current.text);
    setPhase(CLOSED);
    setText("");
  }, [latest, setPhase]);

  useEffect(() => onSelectionPromptOpen(onOpen), [onOpen]);

  const onText = setText;
  const rect = toClippedRect(toUnionRect(selection), bounds);

  return {
    elapsed,
    isRunning,
    label,
    onChat,
    onClose,
    onOpen,
    onSubmit,
    onText,
    phase,
    place,
    placement,
    rect,
    text,
  };
};

export { useSelectionPrompt };

export type { SelectionPromptView };
