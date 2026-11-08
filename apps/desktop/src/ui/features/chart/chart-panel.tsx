import { useMemo } from "react";
import type { ReactElement } from "react";

import { ChartInsertBar } from "./chart-insert-bar.js";
import { ChartKindTiles } from "./chart-kind-tiles.js";
import { ChartOptions } from "./chart-options.js";
import { ChartPaste } from "./chart-paste.js";
import { ChartPreview } from "./chart-preview.js";
import { ChartTable } from "./chart-table.js";
import type { ProjectKind, SelectionContext } from "./deps.js";
import { useChartDraft } from "./use-chart-draft.js";
import { useChartInsert } from "./use-chart-insert.js";
import { useChartInspect } from "./use-chart-inspect.js";

import styles from "./chart.module.css";

interface ChartPanelProps {
  readonly directionId: string | null;
  readonly kind: ProjectKind | undefined;
  readonly projectId: string;
  readonly selection: readonly SelectionContext[] | undefined;
}

const toLayerId = (selection: SelectionContext | null): string | null => {
  if (selection === null || selection.source === null) {
    return null;
  }

  const { col, file, line } = selection.source;

  return `${file}:${line}:${col}`;
};

const ChartPanel = ({
  directionId,
  projectId,
  selection,
}: ChartPanelProps): ReactElement => {
  const { dispatch, draft } = useChartDraft();
  const { inspected } = useChartInspect(projectId, directionId);
  const first = selection?.[0] ?? null;
  const layerId = useMemo(() => toLayerId(first), [first]);
  const insert = useChartInsert({ directionId, draft, layerId, projectId });

  return (
    <div className={styles.panel}>
      <ChartKindTiles dispatch={dispatch} kind={draft.kind} />
      <ChartPreview draft={draft} />
      <ChartOptions dispatch={dispatch} draft={draft} />
      <ChartTable dispatch={dispatch} draft={draft} />
      <ChartPaste dispatch={dispatch} />
      <ChartInsertBar
        hasLayer={layerId !== null}
        insert={insert}
        inspected={inspected}
      />
    </div>
  );
};

export { ChartPanel };

export type { ChartPanelProps };
