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

interface Loaded {
  key: string;
  state: DesignSystemState;
}

const toSourceFile = (loaded: Loaded | null, key: string): string | null => {
  if (loaded?.key === key) {
    return loaded.state.source?.file ?? null;
  }

  return null;
};

const toLoadedState = (
  loaded: Loaded | null,
  key: string
): DesignSystemState | null => {
  if (loaded?.key === key) {
    return loaded.state;
  }

  return null;
};

interface DesignSystemView {
  tokens: DesignTokens | null;
  state: DesignSystemState | null;
}

interface StateRequest {
  readonly directionId: string;
  readonly headVersionId: string | null;
  readonly packId: string | null;
  readonly projectId: string;
  readonly stamp: number;
}

const readState = async (
  request: StateRequest
): Promise<DesignSystemState | null> => {
  try {
    return await api.getDesignSystem(request.projectId, request.directionId);
  } catch {
    return null;
  }
};

const useDesignSystemState = (
  projectId: string,
  project: Project | null,
  directionId: string | null,
  lastChange: FilesChange | null
): DesignSystemView => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const packId = project?.packId ?? null;

  const headVersionId =
    project?.directions.find((direction) => direction.id === directionId)
      ?.headVersionId ?? null;

  const key = `${projectId}:${directionId}`;

  const sourceFile = toSourceFile(loaded, key);

  const stamp = touchesDesignSystem(lastChange, directionId, sourceFile);
  const live = useRef(key);

  useEffect(() => {
    live.current = key;
  }, [key]);

  useEffect(() => {
    if (!directionId) {
      return;
    }

    const want = `${projectId}:${directionId}`;
    let cancelled = false;

    const read = async (): Promise<void> => {
      const state = await readState({
        directionId,
        headVersionId,
        packId,
        projectId,
        stamp,
      });

      if (state && !cancelled && live.current === want) {
        setLoaded({ key: want, state });
      }
    };

    read();

    return (): void => {
      cancelled = true;
    };
  }, [projectId, directionId, packId, headVersionId, stamp]);

  const replace = useCallback(
    (state: DesignSystemState) => setLoaded({ key: live.current, state }),
    []
  );

  return useMemo(() => {
    const state = toLoadedState(loaded, key);

    if (!state || state.entries.length === 0) {
      return { state, tokens: null };
    }

    const { entries } = state;
    const file = state.tokens;
    const mode = (state.manifest?.mode === "dark" && "dark") || "light";
    const source = state.source ?? null;
    const tokens: DesignTokens = { entries, file, mode, replace, source };

    return { state, tokens };
  }, [loaded, key, replace]);
};

export { useDesignSystemState };

export type { DesignTokens, DesignSystemView };
