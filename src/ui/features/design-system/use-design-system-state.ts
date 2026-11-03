import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AppTokenSource,
  CompiledTokenEntry,
  DesignSystemState,
  Project,
  TokenFile,
} from "../../../shared/contracts.js";
import type { TokenMode } from "../../../shared/token-match.js";
import { api } from "../../api.js";
import type { FilesChange } from "../../useStudioData.js";

export interface DesignTokens {
  entries: CompiledTokenEntry[];
  mode: TokenMode;
  file: TokenFile | null;
  source: AppTokenSource | null;
  replace: (state: DesignSystemState) => void;
}

function touchesDesignSystem(
  change: FilesChange | null,
  directionId: string | null,
  sourceFile: string | null
): number {
  if (!change || change.directionId !== directionId) {
    return 0;
  }

  return change.paths.some(
    (file) => file.startsWith("design-system/") || file === sourceFile
  )
    ? change.receivedAt
    : 0;
}

export interface DesignSystemView {
  tokens: DesignTokens | null;
  state: DesignSystemState | null;
}

export function useDesignSystemState(
  projectId: string,
  project: Project | null,
  directionId: string | null,
  lastChange: FilesChange | null
): DesignSystemView {
  const [loaded, setLoaded] = useState<{
    key: string;
    state: DesignSystemState;
  } | null>(null);

  const packId = project?.packId ?? null;

  const headVersionId =
    project?.directions.find((x) => x.id === directionId)?.headVersionId ??
    null;

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

    const tokens: DesignTokens = {
      entries: state.entries,
      file: state.tokens,
      mode: state.manifest?.mode === "dark" ? "dark" : "light",
      source: state.source ?? null,
      replace,
    };

    return { state, tokens };
  }, [loaded, key, replace]);
}
