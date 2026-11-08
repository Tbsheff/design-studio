import type {
  StyleHit,
  StyleValueRow,
} from "@design-studio/contracts/style-search";
import { startTransition, useCallback, useMemo, useState } from "react";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { findElement } from "../../platform/find-element.js";
import type { DesignTokens } from "./deps.js";
import { toCandidates, toTargets } from "./match-picker-model.js";
import type { Candidates } from "./match-picker-model.js";
import { toRowKey } from "./match-scan-model.js";
import { usePageVars } from "./use-style-scan.js";

interface PickerOptions {
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly tokens: DesignTokens | null;
  readonly hits: StyleHit[];
  readonly pageHits: StyleHit[];
  readonly isPageWide: boolean;
  readonly replace: (hits: StyleHit[], token: string) => Promise<void>;
}

interface PickerState {
  readonly picking: StyleValueRow | null;
  readonly candidates: Candidates;
  readonly targets: StyleHit[];
  readonly handleClose: () => void;
  readonly handlePick: (token: string) => void;
  readonly startPicking: (row: StyleValueRow) => void;
}

const runRowFocus = (key: string): void => {
  globalThis.requestAnimationFrame(() => {
    const row = findElement(
      document.body,
      `.sm-section [data-row="${CSS.escape(key)}"]`
    );

    if (row) {
      (findElement(row, '[aria-haspopup="menu"]') ?? row).focus();
    }
  });
};

const useMatchPicker = (options: PickerOptions): PickerState => {
  const { port, tokens, hits, pageHits, isPageWide, replace } = options;
  const [picking, setPicking] = useState<StyleValueRow | null>(null);
  const vars = usePageVars(port, picking !== null);

  const targets = useMemo(() => {
    let source = hits;

    if (isPageWide) {
      source = pageHits;
    }

    return toTargets(picking, source);
  }, [hits, isPageWide, pageHits, picking]);

  const candidates = useMemo(
    () => toCandidates(picking, vars, pageHits, tokens),
    [pageHits, picking, tokens, vars]
  );

  const handleClose = useCallback((): void => {
    if (picking) {
      runRowFocus(toRowKey(picking));
    }

    setPicking(null);
  }, [picking]);

  const handlePick = useCallback(
    (token: string): void => {
      handleClose();
      startTransition(async () => {
        await replace(targets, token);
      });
    },
    [handleClose, replace, targets]
  );

  const startPicking = setPicking;

  return {
    candidates,
    handleClose,
    handlePick,
    picking,
    startPicking,
    targets,
  };
};

export { useMatchPicker };
