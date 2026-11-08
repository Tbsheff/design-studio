import { useCallback, useMemo, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { scenarioRoutes, useAction } from "./deps.js";
import type { RouteOutput } from "./deps.js";

interface ScenarioOptions {
  readonly directionId: string;
  readonly frameId: string;
  readonly projectId: string;
}

type ScenarioRow = RouteOutput<
  typeof scenarioRoutes.listScenario
>["items"][number];

interface ScenarioState {
  readonly appliedId: string | null;
  readonly contactSheet: string | null;
  readonly error: string | null;
  readonly fixtureRoute: string | null;
  readonly handleApply: (scenarioId: string | null) => void;
  readonly handleCheck: () => void;
  readonly handleCreate: () => void;
  readonly isBusy: boolean;
  readonly rows: readonly ScenarioRow[];
}

type CreatedSet = RouteOutput<typeof scenarioRoutes.createScenario> | null;

const toFixtureRoute = (created: CreatedSet): string | null => {
  const hasNoCalls = created?.unseen.some((note) =>
    note.startsWith(copy.noCallsMarker)
  );

  if (created === null || hasNoCalls !== true) {
    return null;
  }

  return created.route;
};

const useScenario = (options: ScenarioOptions): ScenarioState => {
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const [contactSheet, setContactSheet] = useState<string | null>(null);
  const [fixtureRoute, setFixtureRoute] = useState<string | null>(null);
  const [isBusy, startBusy] = useTransition();

  const listInput = useMemo(
    () => ({ ...options, cursor: null, limit: 50 }),
    [options]
  );

  const lister = useAction(scenarioRoutes.listScenario, listInput);

  const creator = useAction(scenarioRoutes.createScenario);

  const applier = useAction(scenarioRoutes.applyScenario);

  const runner = useAction(scenarioRoutes.runScenario);

  const handleCreate = useCallback(() => {
    startBusy(async () => {
      const done = await creator.run(options);

      setFixtureRoute(toFixtureRoute(done));
    });
  }, [creator, options]);

  const handleApply = useCallback(
    (scenarioId: string | null) => {
      startBusy(async () => {
        const done = await applier.run({ ...options, scenarioId });

        if (done !== null) {
          setAppliedId(scenarioId);
        }
      });
    },
    [applier, options]
  );

  const handleCheck = useCallback(() => {
    startBusy(async () => {
      const done = await runner.run(options);

      setContactSheet(done?.contactSheet ?? null);
    });
  }, [options, runner]);

  const failure = creator.error ?? applier.error ?? runner.error;

  const error = failure?.message ?? null;

  const rows = lister.data?.items ?? [];

  return {
    appliedId,
    contactSheet,
    error,
    fixtureRoute,
    handleApply,
    handleCheck,
    handleCreate,
    isBusy,
    rows,
  };
};

export { useScenario };

export type { ScenarioOptions, ScenarioRow, ScenarioState };
