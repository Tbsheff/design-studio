import { useCallback, useMemo, useState, useTransition } from "react";

import { galleryRoutes, propRoutes, useAction } from "./deps.js";
import type { SourceLoc } from "./deps.js";
import { toCellViews } from "./gallery-model.js";
import type { CellView } from "./gallery-model.js";

interface GallerySetup {
  readonly component: string;
  readonly directionId: string | null;
  readonly file: string | null;
  readonly projectId: string;
  readonly target: SourceLoc | null;
}

interface Gallery {
  readonly applied: boolean;
  readonly cells: readonly CellView[];
  readonly error: string | null;
  readonly handleBuild: () => void;
  readonly handleSelect: (id: string) => void;
  readonly handleAdopt: () => void;
  readonly isBusy: boolean;
  readonly selected: CellView | null;
}

interface GalleryRef {
  readonly component: string;
  readonly directionId: string;
  readonly file?: string;
  readonly projectId: string;
}

interface CellsState {
  readonly cells: readonly CellView[];
  readonly error: string | null;
}

const withFile = <Base extends object>(
  base: Base,
  file: string | null
): Base & { readonly file?: string } => {
  if (file === null) {
    return base;
  }

  return { ...base, file };
};

interface Build {
  readonly error: string | null;
  readonly handleBuild: () => void;
  readonly isBuilt: boolean;
  readonly isBusy: boolean;
}

const useBuild = (setup: GallerySetup, onBuilt: () => void): Build => {
  const { component, directionId, file, projectId } = setup;
  const [isBuilt, setIsBuilt] = useState(false);
  const [isWorking, startWork] = useTransition();
  const creator = useAction(galleryRoutes.createGallery);
  const { run } = creator;

  const handleBuild = useCallback(() => {
    if (directionId === null) {
      return;
    }

    startWork(async () => {
      const body = {
        component,
        directionId,
        projectId,
        schemes: "both",
      } as const;

      const done = await run(withFile(body, file));

      if (done !== null) {
        setIsBuilt(true);
        onBuilt();
      }
    });
  }, [component, directionId, file, onBuilt, projectId, run]);

  const error = creator.error?.message ?? null;
  const isBusy = isWorking || creator.pending;

  return { error, handleBuild, isBuilt, isBusy };
};

const useCells = (setup: GallerySetup, isBuilt: boolean): CellsState => {
  const { component, directionId, file, projectId } = setup;

  const input = useMemo((): GalleryRef | null => {
    if (!isBuilt || directionId === null) {
      return null;
    }

    return withFile({ component, directionId, projectId }, file);
  }, [component, directionId, file, isBuilt, projectId]);

  const inspected = useAction(galleryRoutes.inspectGallery, input);
  const cells = useMemo(() => toCellViews(inspected.data), [inspected.data]);

  return { cells, error: inspected.error?.message ?? null };
};

const useGallery = (setup: GallerySetup): Gallery => {
  const { directionId, projectId, target } = setup;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [isWorking, startWork] = useTransition();
  const setter = useAction(propRoutes.setProp);
  const { run: runSet } = setter;

  const handleBuilt = useCallback(() => setApplied(false), []);
  const build = useBuild(setup, handleBuilt);
  const { cells, error: cellError } = useCells(setup, build.isBuilt);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setApplied(false);
  }, []);

  const selected = cells.find((cell) => cell.id === selectedId) ?? null;

  const handleAdopt = useCallback(() => {
    if (directionId === null || target === null || selected === null) {
      return;
    }

    startWork(async () => {
      const done = await runSet({
        directionId,
        projectId,
        props: { ...selected.props },
        source: target,
      });

      setApplied(done !== null);
    });
  }, [directionId, projectId, runSet, selected, target]);

  const { handleBuild } = build;
  const error = build.error ?? setter.error?.message ?? cellError;
  const isBusy = isWorking || build.isBusy || setter.pending;

  return {
    applied,
    cells,
    error,
    handleAdopt,
    handleBuild,
    handleSelect,
    isBusy,
    selected,
  };
};

export { useGallery };

export type { Gallery, GallerySetup };
