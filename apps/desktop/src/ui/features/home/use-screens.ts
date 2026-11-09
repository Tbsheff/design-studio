import { routes } from "@design-studio/actions/dev-server/routes";

import { useAction } from "../../platform/query.js";

interface ScreenRoute {
  readonly file: string;
  readonly route: string;
}

interface ScreensState {
  readonly isLoading: boolean;
  readonly screens: readonly ScreenRoute[] | null;
}

const toInput = (
  projectId: string | null,
  isOpen: boolean
): { readonly projectId: string } | null => {
  if (projectId === null || !isOpen) {
    return null;
  }

  return { projectId };
};

const useScreens = (
  projectId: string | null,
  isOpen: boolean
): ScreensState => {
  const state = useAction(
    routes.listRoutesDevServer,
    toInput(projectId, isOpen)
  );

  return {
    isLoading: state.loading,
    screens: state.data?.routes ?? null,
  };
};

export { useScreens };

export type { ScreenRoute, ScreensState };
