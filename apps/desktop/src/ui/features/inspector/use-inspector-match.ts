import type {
  StyleHit,
  StyleValueRow,
} from "@design-studio/contracts/style-search";
import { summarizeHits } from "@design-studio/contracts/style-search";
import { startTransition, useCallback, useMemo, useState } from "react";

import { PAGE_QUERY, toReplaceLabel, toScopeQuery } from "./match-model.js";
import type { MatchActions } from "./match-model.js";
import { toLookup } from "./match-scan-model.js";
import type { InspectorMatchProps, Scope, Status } from "./match-scan-model.js";
import { useMatchPicker } from "./use-match-picker.js";
import { useMatchReplace } from "./use-match-replace.js";
import { useMatchSelect } from "./use-match-select.js";
import { useStableValue } from "./use-stable-value.js";
import { useStyleScan } from "./use-style-scan.js";

interface MatchState {
  readonly actions: MatchActions;
  readonly isPageWide: boolean;
  readonly picker: ReturnType<typeof useMatchPicker>;
  readonly replaceLabel: string;
  readonly rows: ReturnType<typeof summarizeHits>;
  readonly scanned: StyleHit[] | null;
  readonly scope: Scope;
  readonly status: Status;
  readonly setScope: (scope: Scope) => void;
}

const useMatchRows = (
  hits: StyleHit[] | null,
  tokens: InspectorMatchProps["tokens"]
): ReturnType<typeof summarizeHits> => {
  const lookup = useMemo(() => toLookup(tokens), [tokens]);

  return useMemo(() => summarizeHits(hits ?? [], lookup), [hits, lookup]);
};

const useInspectorMatch = (props: InspectorMatchProps): MatchState => {
  const { port, tokens, selection } = props;
  const [scope, setScope] = useState<Scope>("selection");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const selectors = selection.map((item) => item.selector);
  const selectorKey = selectors.join("\n");
  const stableSelectors = useStableValue(selectors, selectorKey);

  const query = useMemo(
    () => toScopeQuery(scope, stableSelectors),
    [scope, stableSelectors]
  );

  const scan = useStyleScan(port, query);
  const pageScan = useStyleScan(port, PAGE_QUERY);
  const { refresh: refreshScanned, hits: scanned } = scan;
  const { refresh: refreshPage, hits: pageRaw } = pageScan;
  const pageHits = pageRaw ?? [];
  const rows = useMatchRows(scanned, tokens);

  const refreshAll = useCallback((): void => {
    refreshScanned();
    refreshPage();
  }, [refreshPage, refreshScanned]);

  const replace = useMatchReplace(props, setStatus, refreshAll);
  const selectBy = useMatchSelect(port, setStatus);
  const isPageWide = scope === "page" || selection.length === 1;

  const hits = scanned ?? [];

  const picker = useMatchPicker({
    hits,
    isPageWide,
    pageHits,
    port,
    replace,
    tokens,
  });

  const { startPicking } = picker;

  const actions = useMemo<MatchActions>(
    () => ({
      replace: (row: StyleValueRow): void => {
        setStatus({ kind: "idle" });
        startPicking(row);
      },
      selectClass: (row: StyleValueRow, cls: string): void => {
        startTransition(async () => {
          await selectBy(row, { className: cls });
        });
      },
      selectValue: (row: StyleValueRow): void => {
        startTransition(async () => {
          await selectBy(row, { value: row.value });
        });
      },
    }),
    [selectBy, startPicking]
  );

  const replaceLabel = toReplaceLabel(isPageWide);

  return {
    actions,
    isPageWide,
    picker,
    replaceLabel,
    rows,
    scanned,
    scope,
    setScope,
    status,
  };
};

export { useInspectorMatch };

export type { MatchState };
