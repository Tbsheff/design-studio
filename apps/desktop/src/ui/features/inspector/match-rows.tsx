import { useCallback, useEffect, useRef, useState } from "react";

import { isRawClass } from "../../../shared/style-search.js";
import type { StyleKind, StyleValueRow } from "../../../shared/style-search.js";
import { Icon } from "../../kit/Icon.js";
import { usePopover } from "../../kit/use-popover.js";
import { shownValue, StateTag, Swatch } from "./match-candidates.js";
import { ROWS_SHOWN, KIND_LABEL, rowKey } from "./match-scan.js";
import type { Scope, Status } from "./match-scan.js";

interface RowActions {
  selectValue: (row: StyleValueRow) => void;
  selectClass: (row: StyleValueRow, cls: string) => void;
  replace: (row: StyleValueRow) => void;
}

const RowMenu = ({
  row,
  actions,
  replaceLabel,
}: {
  row: StyleValueRow;
  actions: RowActions;
  replaceLabel: string;
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus();
    }
  }, []);

  usePopover(open, root, close);
  useEffect(() => {
    if (open) {
      root.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
    }
  }, [open]);

  const run = (task: () => void) => () => {
    close(false);
    task();
  };

  const raws = row.classes.filter(isRawClass).slice(0, 2);
  const named = row.classes.filter((cls) => !isRawClass(cls)).slice(0, 2);

  return (
    <div className="sm-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="icon-btn small"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${shownValue(row)}`}
        data-tip={open ? undefined : "Select or replace"}
        data-tip-align="end"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div
          className="ui-menu sm-menu"
          role="menu"
          aria-label={`${shownValue(row)} actions`}
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="ui-menu-item"
            onClick={run(() => actions.selectValue(row))}
          >
            <Icon name="pointer" size={14} />
            <span>Select all with this value</span>
          </button>
          {[...raws, ...named].map((cls) => (
            <button
              key={cls}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="ui-menu-item"
              onClick={run(() => actions.selectClass(row, cls))}
            >
              <Icon name="code" size={14} />
              <span className="sm-menu-class">
                Select all with <code>{cls}</code>
              </span>
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="ui-menu-item"
            onClick={run(() => actions.replace(row))}
          >
            <Icon name="token" size={14} />
            <span>{replaceLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

const ValueRow = ({
  row,
  actions,
  replaceLabel,
}: {
  row: StyleValueRow;
  actions: RowActions;
  replaceLabel: string;
}) => (
  <li className="sm-row" data-testid="style-value" data-row={rowKey(row)}>
    <Swatch kind={row.kind} value={row.value} />
    <span className="sm-value">{shownValue(row)}</span>
    <StateTag row={row} onReplace={() => actions.replace(row)} />
    <span
      className="sm-count"
      data-tip={`${row.count} ${row.count === 1 ? "element" : "elements"}`}
    >
      {row.count}
    </span>
    <RowMenu row={row} actions={actions} replaceLabel={replaceLabel} />
  </li>
);

const KindGroup = ({
  kind,
  rows,
  actions,
  replaceLabel,
}: {
  kind: StyleKind;
  rows: StyleValueRow[];
  actions: RowActions;
  replaceLabel: string;
}) => {
  const [all, setAll] = useState(false);

  if (rows.length === 0) {
    return null;
  }

  const shown = all ? rows : rows.slice(0, ROWS_SHOWN);

  return (
    <div className="sm-group">
      <h4 className="sm-group-head">{KIND_LABEL[kind]}</h4>
      <ul className="sm-list">
        {shown.map((row) => (
          <ValueRow
            key={rowKey(row)}
            row={row}
            actions={actions}
            replaceLabel={replaceLabel}
          />
        ))}
      </ul>
      {rows.length > ROWS_SHOWN && (
        <button
          type="button"
          className="tk-lint-more"
          aria-expanded={all}
          onClick={() => setAll(!all)}
        >
          {all ? "Show fewer" : `Show ${rows.length - ROWS_SHOWN} more`}
        </button>
      )}
    </div>
  );
};

const ScopeToggle = ({
  scope,
  onScope,
}: {
  scope: Scope;
  onScope: (scope: Scope) => void;
}) => (
  <div
    className="segmented sm-scope"
    role="radiogroup"
    aria-label="Values from"
  >
    {(["selection", "page"] as const).map((id) => (
      <button
        key={id}
        type="button"
        role="radio"
        aria-checked={scope === id}
        tabIndex={scope === id ? 0 : -1}
        className={scope === id ? "on" : ""}
        onClick={() => onScope(id)}
      >
        {id === "selection" ? "Selection" : "Page"}
      </button>
    ))}
  </div>
);

const StatusLine = ({ status }: { status: Status }) => {
  if (status.kind === "idle") {
    return null;
  }

  return (
    <p
      className={`sm-status ${status.kind}`}
      role={status.kind === "error" ? "alert" : "status"}
    >
      {status.kind === "busy" && <span className="spinner" />}
      {status.text}
    </p>
  );
};

export { KindGroup, ScopeToggle, StatusLine };

export type { RowActions };
