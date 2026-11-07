import { useCallback, useEffect, useRef, useTransition } from "react";

import { api } from "./deps.js";
import { toTokenChanges } from "./theme-model.js";
import type { ThemeItem } from "./theme-model.js";

interface PreviewSetup {
  readonly directionId: string;
  readonly items: readonly ThemeItem[];
  readonly onPreview: (css: string) => void;
  readonly projectId: string;
}

const useThemePreview = (setup: PreviewSetup): (() => void) => {
  const { directionId, items, onPreview, projectId } = setup;
  const shown = useRef<string | null>(null);
  const [, startWork] = useTransition();
  const active = items.find((item) => item.isActive) ?? null;
  const activeId = active?.id ?? null;

  useEffect(() => {
    if (activeId === shown.current) {
      return;
    }

    shown.current = activeId;

    if (active === null) {
      onPreview("");

      return;
    }

    startWork(async () => {
      const result = await api.previewTokens(
        projectId,
        directionId,
        toTokenChanges(active)
      );

      if (result.errors.length === 0 && shown.current === active.id) {
        onPreview(result.css);
      }
    });
  }, [active, activeId, directionId, onPreview, projectId]);

  const forget = useCallback(() => {
    shown.current = null;
  }, []);

  return forget;
};

export { useThemePreview };
