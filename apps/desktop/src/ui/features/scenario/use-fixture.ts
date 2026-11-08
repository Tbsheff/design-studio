import { useCallback, useMemo, useTransition } from "react";

import { fixtureRoutes, useAction } from "./deps.js";
import type { RouteOutput } from "./deps.js";

interface FixtureOptions {
  readonly directionId: string;
  readonly projectId: string;
  readonly route: string | null;
}

type FixtureRow = RouteOutput<
  typeof fixtureRoutes.listFixture
>["items"][number];

interface FixtureState {
  readonly error: string | null;
  readonly handleCreate: () => void;
  readonly handleDelete: (fixtureId: string) => void;
  readonly isBusy: boolean;
  readonly rows: readonly FixtureRow[];
}

const useFixture = (options: FixtureOptions): FixtureState => {
  const { directionId, projectId, route } = options;
  const [isBusy, startBusy] = useTransition();

  const listInput = useMemo(
    () => ({ cursor: null, limit: 50, projectId }),
    [projectId]
  );

  const lister = useAction(fixtureRoutes.listFixture, listInput);
  const creator = useAction(fixtureRoutes.createFixture);
  const remover = useAction(fixtureRoutes.deleteFixture);

  const handleCreate = useCallback(() => {
    if (route === null) {
      return;
    }

    const params = {};
    const searchParams = {};
    const shell = "inherit" as const;

    startBusy(async () => {
      await creator.run({
        directionId,
        params,
        projectId,
        route,
        searchParams,
        shell,
      });
    });
  }, [creator, directionId, projectId, route]);

  const handleDelete = useCallback(
    (fixtureId: string) => {
      startBusy(async () => {
        await remover.run({ fixtureId, projectId });
      });
    },
    [projectId, remover]
  );

  const failure = creator.error ?? remover.error;
  const error = failure?.message ?? null;
  const rows = lister.data?.items ?? [];

  return { error, handleCreate, handleDelete, isBusy, rows };
};

export { useFixture };

export type { FixtureOptions, FixtureRow, FixtureState };
