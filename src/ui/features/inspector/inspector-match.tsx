import { memo, useCallback, useMemo, useState } from "react";

import type { SelectionContext } from "../../../shared/contracts.js";
import {
  STYLE_KINDS,
  hitsForRow,
  matchesOf,
  replaceSummary,
  summarizeHits,
  unlocatedCount,
  type StyleHit,
  type StyleQuery,
  type StyleValueRow,
} from "../../../shared/style-search.js";
import { errorText, replaceStyle } from "../../api.js";
import { InspectorSection } from "./inspector-fields.js";

import "../../styles/inspector-match.css";
import { designCandidates, uniqueTokens } from "./match-candidates.js";
import {
  type RowActions,
  KindGroup,
  ScopeToggle,
  StatusLine,
} from "./match-rows.js";
import {
  type InspectorMatchProps,
  type Scope,
  type Status,
  usePageVars,
  rowKey,
  requestStyles,
  lookupFor,
  useStyleScan,
} from "./match-scan.js";
import { TokenPicker } from "./match-token-picker.js";

function useReplace(
  props: InspectorMatchProps,
  setStatus: (status: Status) => void,
  refresh: () => void
) {
  return useCallback(
    async (hits: StyleHit[], token: string) => {
      const matches = matchesOf(hits);
      const unlocated = unlocatedCount(hits);

      if (matches.length === 0) {
        return setStatus({
          kind: "error",
          text: "These elements have no source location, so they cannot be changed here.",
        });
      }

      setStatus({ kind: "busy", text: `Replacing ${matches.length} values…` });

      try {
        await props.drain();

        const result = await replaceStyle(props.projectId, props.directionId, {
          matches,
          token,
        });

        const extra =
          unlocated > 0
            ? `. ${unlocated} without a source location left as they are`
            : "";

        setStatus({
          kind: result.replaced > 0 ? "done" : "error",
          text: `${replaceSummary(result, token)}${extra}.`,
        });
        refresh();
      } catch (error) {
        setStatus({ kind: "error", text: errorText(error) });
      }
    },
    [props, setStatus, refresh]
  );
}

function selectedText(count: number, total: number): string {
  if (count === 0) {
    return "No element on this page has a source location for that value.";
  }

  return total > count
    ? `Selected ${count} of ${total} elements (the first ${count}).`
    : `Selected ${count} ${count === 1 ? "element" : "elements"}.`;
}

function focusRow(key: string): void {
  window.requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(
      `.sm-section [data-row="${CSS.escape(key)}"]`
    );

    (row?.querySelector<HTMLElement>('[aria-haspopup="menu"]') ?? row)?.focus();
  });
}

function InspectorMatch(props: InspectorMatchProps) {
  const single = props.selection.length === 1;
  const [scope, setScope] = useState<Scope>("selection");
  const [picking, setPicking] = useState<StyleValueRow | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const selectors = props.selection.map((s) => s.selector);

  const query = useMemo<StyleQuery>(
    () => (scope === "page" ? {} : { within: selectors }),
    [scope, selectors.join("\n")]
  );

  const scanned = useStyleScan(
    props.port,
    query,
    `${scope}|${selectors.join("\n")}`
  );

  const page = useStyleScan(props.port, {}, "page");
  const vars = usePageVars(props.port, picking !== null);
  const lookup = useMemo(() => lookupFor(props.tokens), [props.tokens]);

  const rows = useMemo(
    () => summarizeHits(scanned.hits ?? [], lookup),
    [scanned.hits, lookup]
  );

  const refreshAll = useCallback(() => {
    scanned.refresh();
    page.refresh();
  }, [scanned.refresh, page.refresh]);

  const replace = useReplace(props, setStatus, refreshAll);
  const pageWide = scope === "page" || single;

  const replaceLabel = pageWide
    ? "Replace on page with token…"
    : "Replace in selection with token…";

  const selectBy = useCallback(
    async (row: StyleValueRow, extra: StyleQuery) => {
      setStatus({ kind: "busy", text: "Finding matches…" });

      const reply = await requestStyles(
        props.port.current,
        { property: row.kind, ...extra },
        true
      );

      setStatus(
        reply
          ? {
              kind: "done",
              text: selectedText(reply.selected, reply.result.elements),
            }
          : {
              kind: "error",
              text: "The frame did not answer. Reload it and try again.",
            }
      );
    },
    [props.port]
  );

  const actions: RowActions = {
    selectValue: (row) => void selectBy(row, { value: row.value }),
    selectClass: (row, cls) => void selectBy(row, { className: cls }),
    replace: (row) => {
      setStatus({ kind: "idle" });
      setPicking(row);
    },
  };

  const targets = picking
    ? hitsForRow(pageWide ? (page.hits ?? []) : (scanned.hits ?? []), picking)
    : [];

  const candidates = picking
    ? uniqueTokens([
        ...varCandidates(picking, vars),
        ...classCandidates(picking, page.hits ?? []),
        ...(props.tokens
          ? designCandidates(picking, props.tokens.entries, props.tokens.mode)
          : []),
      ])
    : [];

  const closePicker = () => {
    if (picking) {
      focusRow(rowKey(picking));
    }

    setPicking(null);
  };

  const pick = (token: string) => {
    const hits = targets;
    closePicker();
    void replace(hits, token);
  };

  const title =
    scope === "page"
      ? "Page values"
      : props.selection.length > 1
        ? "Selection values"
        : "Values";

  return (
    <InspectorSection
      title={title}
      className="sm-section"
      aside={<ScopeToggle scope={scope} onScope={setScope} />}
    >
      {scanned.hits === null && <p className="sm-empty">Reading values…</p>}
      {scanned.hits !== null && rows.length === 0 && (
        <p className="sm-empty">
          {scope === "page"
            ? "No colors, sizes, radii or spacing found on this page."
            : "This selection sets no color, font size, radius or spacing of its own."}
        </p>
      )}
      {STYLE_KINDS.map((kind) => (
        <KindGroup
          key={kind}
          kind={kind}
          rows={rows.filter((row) => row.kind === kind)}
          actions={actions}
          replaceLabel={replaceLabel}
        />
      ))}
      {picking && (
        <TokenPicker
          row={picking}
          candidates={candidates}
          target={`${targets.length === 1 ? "1 element" : `${new Set(targets.map((t) => t.selector)).size} elements`}${pageWide ? " on this page" : " in the selection"}`}
          onPick={pick}
          onClose={closePicker}
        />
      )}
      <StatusLine status={status} />
    </InspectorSection>
  );
}

function sameItems(a: SelectionContext[], b: SelectionContext[]): boolean {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

export default memo(
  InspectorMatch,
  (a, b) =>
    a.projectId === b.projectId &&
    a.directionId === b.directionId &&
    a.port === b.port &&
    a.tokens === b.tokens &&
    a.drain === b.drain &&
    sameItems(a.selection, b.selection)
);
