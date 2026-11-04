import { useCallback, useMemo, useState } from "react";

import { useSweepActions } from "./sweep-actions.js";
import { groupChanges } from "./sweep-model.js";
import type { SweepGroup, SweepView } from "./sweep-model.js";

interface SweepSetup {
  readonly directionId: string | null;
  readonly projectId: string;
}

interface Sweep {
  readonly applied: string | null;
  readonly error: string | null;
  readonly groups: readonly SweepGroup[];
  readonly handleApply: () => void;
  readonly handleScan: () => void;
  readonly handleToggle: (id: string) => void;
  readonly handleUndo: () => void;
  readonly isBusy: boolean;
  readonly report: SweepView | null;
  readonly selected: ReadonlySet<string>;
}

const idsOf = (report: SweepView): Set<string> =>
  new Set(report.changes.map((change) => change.id));

const useSweep = (setup: SweepSetup): Sweep => {
  const [report, setReport] = useState<SweepView | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [applied, setApplied] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const handleScanned = useCallback((found: SweepView) => {
    setApplied(null);
    setFailure(null);
    setReport(found);
    setSelected(idsOf(found));
  }, []);

  const handleSwept = useCallback((done: SweepView) => {
    setApplied(done.versionId);
    setReport({ ...done, changes: [] });
    setSelected(new Set());
  }, []);

  const handleUndone = useCallback(() => {
    setApplied(null);
    setFailure(null);
  }, []);

  const actions = useSweepActions({
    directionId: setup.directionId,
    onFailure: setFailure,
    onScanned: handleScanned,
    onSwept: handleSwept,
    onUndone: handleUndone,
    projectId: setup.projectId,
    selected,
  });

  const handleToggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);

      if (!next.delete(id)) {
        next.add(id);
      }

      return next;
    });
  }, []);

  const groups = useMemo(() => groupChanges(report?.changes ?? []), [report]);
  const error = failure ?? actions.error;

  const { apply: handleApply, isBusy, scan: handleScan } = actions;
  const { undo: handleUndo } = actions;

  return {
    applied,
    error,
    groups,
    handleApply,
    handleScan,
    handleToggle,
    handleUndo,
    isBusy,
    report,
    selected,
  };
};

export { useSweep };

export type { Sweep, SweepSetup };
