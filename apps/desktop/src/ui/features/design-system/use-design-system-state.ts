import type {
  AppTokenSource,
  CompiledTokenEntry,
  DesignSystemState,
  Project,
  TokenFile,
} from "@design-studio/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TokenMode } from "../../../shared/token-match.js";
import { api } from "../../api.js";
import type { FilesChange } from "../home/use-studio-data.js";

interface DesignTokens {
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  file: TokenFile | null;
  source: AppTokenSource | null;
  replace: (state: DesignSystemState) => void;
}

const touchesDesignSystem = (
  change: FilesChange | null,
  directionId: string | null,
  sourceFile: string | null
): number => {
  if (!change || change.directionId !== directionId) {
    return 0;
  }

  if (
    change.paths.some(
      (file) => file.startsWith("design-system/") || file === sourceFile
    )
  ) {
    return change.receivedAt;
  }
  return 0;
};

interface DesignSystemView {
  tokens: DesignTokens | null;
  state: DesignSystemState | null;
}

const useDesignSystemState = (
  projectId: string,
  project: Project | null,
  directionId: string | null,
  lastChange: FilesChange | null
): DesignSystemView => {
  const [loaded, setLoaded] = useState<{
    key: string;
    state: DesignSystemState;
  } | null>(null);

  const packId = project?.packId ?? null;

  const headVersionId =
    project?.directions.find((direction) => direction.id === directionId)
      ?.headVersionId ?? null;

  const key = `${projectId}:${directionId}`;

  const sourceFile =
    loaded?.key === key ? (loaded.state.source?.file ?? null) : null;

  const stamp = touchesDesignSystem(lastChange, directionId, sourceFile);
  const live = useRef(key);
  live.current = key;

  useEffect(() => {
    if (!directionId) {
      return;
    }

    const want = `${projectId}:${directionId}`;
    let cancelled = false;

    const read = async (): Promise<void> => {
      let state: DesignSystemState | null = null;

      try {
        state = await api.getDesignSystem(projectId, directionId);
      } catch {
        state = null;
      }

      if (state && !cancelled && live.current === want) {
        setLoaded({ key: want, state });
      }
    };

    void read();

    return (): void => {
      cancelled = true;
    };
  }, [projectId, directionId, packId, headVersionId, stamp]);

  const replace = useCallback(
    (state: DesignSystemState) => setLoaded({ key: live.current, state }),
    []
  );

  return useMemo(() => {
    const state = loaded?.key === key ? loaded.state : null;

    if (!state || state.entries.length === 0) {
      return { state, tokens: null };
    }

    const { entries } = state;
    const file = state.tokens;
    const mode = state.manifest?.mode === "dark" ? "dark" : "light";
    const source = state.source ?? null;
    const tokens: DesignTokens = { entries, file, mode, replace, source };

    return { state, tokens };
  }, [loaded, key, replace]);
};

export { useDesignSystemState };

export type { DesignTokens, DesignSystemView };
