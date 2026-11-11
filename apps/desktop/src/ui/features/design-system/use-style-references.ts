import { routes as projectRoutes } from "@design-studio/actions/project/routes";
import { routes as referenceRoutes } from "@design-studio/actions/reference/routes";
import { useCallback, useTransition } from "react";

import type { RouteOutput } from "../../platform/http.js";
import { useAction } from "../../platform/query.js";

type StyleReferencePin = RouteOutput<
  typeof referenceRoutes.listReference
>["items"][number];

interface StyleReferences {
  readonly error: string | null;
  readonly isLoading: boolean;
  readonly isPending: boolean;
  readonly pins: readonly StyleReferencePin[];
  readonly unpin: (frameId: string) => void;
}

const PIN_PAGE = 200;

const useStyleReferences = (projectId: string): StyleReferences => {
  const list = useAction(referenceRoutes.listReference, {
    cursor: null,
    limit: PIN_PAGE,
    projectId,
  });

  const { run } = useAction(referenceRoutes.setReference);
  const [isPending, startUnpin] = useTransition();

  const unpin = useCallback(
    (frameId: string): void => {
      const ids = { frameId, projectId };

      startUnpin(async () => {
        await run({ ...ids, isPinned: false });
      });
    },
    [projectId, run]
  );

  const error = list.error?.message ?? null;
  const isLoading = list.loading;
  const pins = list.data?.items ?? [];

  return { error, isLoading, isPending, pins, unpin };
};

const toThumbInput = (
  projectId: string,
  path: string | null
): { readonly path: string; readonly projectId: string } | null => {
  if (path === null) {
    return null;
  }

  return { path, projectId };
};

const useStyleReferenceThumb = (
  projectId: string,
  path: string | null
): string | null => {
  const file = useAction(
    projectRoutes.getFileProject,
    toThumbInput(projectId, path)
  );

  if (!file.data) {
    return null;
  }

  return `data:${file.data.mimeType};base64,${file.data.data}`;
};

export { useStyleReferenceThumb, useStyleReferences };

export type { StyleReferencePin, StyleReferences };
