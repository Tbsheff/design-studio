import type { Version } from "@design-studio/actions/_core/contracts";
import { api } from "../../api";
import { openCompareInCode } from "../../features/versions-layers-tokens/versions-api";
import { reviewPair } from "./project-model";
import { assignRef } from "./ref-model";
import type {
  StudioBase,
  StudioHistoryActions,
  StudioReview,
} from "./studio-core-types";
import type { StudioUi } from "./studio-ui-types";

const useStudioHistory = (
  projectId: string,
  ui: StudioUi,
  base: StudioBase
): StudioHistoryActions => {
  const { data, directionId } = base;

  const refreshAfter = <Result>(fn: () => Promise<Result>): Promise<void> =>
    ui.act(async (): Promise<void> => {
      await fn();
      data.refreshVersions();
    });

  const withDid = async <Result>(
    fn: (id: string) => Promise<Result>
  ): Promise<void> => {
    if (directionId) {
      await fn(directionId);
    }
  };

  const undo = (): Promise<void> =>
    withDid(async (id): Promise<void> => {
      await ui.editControl.current?.settle();
      ui.port.current?.post({ type: "preview-reset" });
      ui.port.current?.post({ type: "optimistic-drop" });
      ui.setSelection([]);

      await refreshAfter((): Promise<Version> => api.undo(projectId, id));
    });

  assignRef(ui.undoRef, undo);

  return { refreshAfter, undo, withDid };
};

const useStudioReview = (
  projectId: string,
  ui: StudioUi,
  base: StudioBase
): StudioReview => {
  const { data, directionId, versions } = base;

  const openReview = (pair: [Version, Version]): void => {
    openCompareInCode();
    ui.setCompareOpen(false);
    ui.setCompare(pair);
    requestAnimationFrame((): void => ui.setCompareOpen(true));
  };

  const openFreshReview = async (
    id: string,
    versionId: string
  ): Promise<boolean> => {
    try {
      const list = await api.listVersions(projectId, id);
      const fresh = reviewPair(list, versionId);

      if (fresh) {
        openReview(fresh);
      }

      return fresh !== null;
    } catch {
      return false;
    }
  };

  const reviewVersionId = async (versionId: string): Promise<void> => {
    const pair = reviewPair(versions, versionId);

    if (pair) {
      openReview(pair);

      return;
    }

    if (!directionId) {
      return;
    }

    const pending = openFreshReview(directionId, versionId);

    data.refreshVersions();
    await pending;
  };

  const reviewVersion = (version: Version): Promise<void> =>
    reviewVersionId(version.id);

  return { reviewVersion, reviewVersionId };
};

export { useStudioReview, useStudioHistory };
