import { useRef, type ReactNode } from "react";

import { Icon, type IconName } from "../../kit/Icon.js";
import { UiSelect } from "../../kit/UiSelect.js";
import {
  activeCell,
  alignCell,
  isFlexDisplay,
  isGridDisplay,
} from "../../sizing.js";
import type { DirectEdit } from "../../useDirectEdit.js";
import { InspectorSection, SelectField } from "./inspector-fields.js";
import { AddButton } from "./inspector-shared.js";
import { write, useLayoutKeys } from "./layout-keys.js";
import { NumberField } from "./number-field.js";

const DIRECTIONS: { value: string; icon: IconName; label: string }[] = [
  { value: "row", icon: "arrowRight", label: "Horizontal" },
  { value: "column", icon: "arrowDown", label: "Vertical" },
];

const POSITIONS = ["start", "center", "end"];

const DISPLAYS = [
  "block",
  "inline",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "none",
];

function gridValue(value: string): string {
  if (value === "flex-start") return "start";
  if (value === "flex-end") return "end";
  return value;
}

function AlignGrid({
  edit,
  isRow,
  grid = false,
}: {
  edit: DirectEdit;
  isRow: boolean;
  grid?: boolean;
}) {
  const justifyProp = grid ? "justify-items" : "justify-content";
  const active = activeCell(
    edit.values[justifyProp],
    edit.values["align-items"],
    isRow
  );
  return (
    <div className="ins-align-grid" role="group" aria-label="Alignment">
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => {
          const on = active?.col === col && active.row === row;
          const label = `Align ${POSITIONS[row]} ${POSITIONS[col]}`;
          return (
            <button
              key={`${row}-${col}`}
              type="button"
              className={on ? "on" : ""}
              aria-label={label}
              aria-pressed={on}
              data-tip={label}
              onClick={() => {
                const cell = alignCell(col, row, isRow);
                write(
                  edit,
                  grid
                    ? {
                        "justify-items": gridValue(cell.justify),
                        "align-items": gridValue(cell.align),
                      }
                    : {
                        "justify-content": cell.justify,
                        "align-items": cell.align,
                      }
                );
              }}
            >
              <span className="ins-align-dot" aria-hidden="true" />
            </button>
          );
        })
      )}
    </div>
  );
}

type GapMode = "fixed" | "auto";

const GAP_MODES: { value: GapMode; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "auto", label: "Auto" },
];

const DEFAULT_GAP = "8px";

function useLastGap(edit: DirectEdit): string {
  const last = useRef(
    parseFloat(edit.values.gap) > 0 ? edit.values.gap : DEFAULT_GAP
  );
  if (parseFloat(edit.values.gap) > 0) last.current = edit.values.gap;
  return last.current;
}

function GapModeField({ edit }: { edit: DirectEdit }) {
  const mode: GapMode =
    edit.values["justify-content"] === "space-between" ? "auto" : "fixed";
  const lastGap = useLastGap(edit);
  const change = (next: GapMode) => {
    if (next === mode) return;
    write(
      edit,
      next === "auto"
        ? { "justify-content": "space-between", gap: "" }
        : { "justify-content": "", gap: lastGap }
    );
  };
  return (
    <div
      className="ins-field select ins-gap-mode"
      data-tip="Auto puts the space between the children"
      data-tip-align="end"
    >
      <span className="ins-scrub static">Spacing</span>
      <UiSelect
        className="ins-select"
        aria-label="Gap mode"
        value={mode}
        options={GAP_MODES}
        onChange={change}
      />
    </div>
  );
}

function GapFields({
  edit,
  split,
  auto,
}: {
  edit: DirectEdit;
  split: boolean;
  auto: boolean;
}) {
  if (split) {
    return (
      <div className="ins-gap-pair">
        <NumberField
          short="Row"
          spec={{ prop: "row-gap", label: "Row gap", edit, min: 0 }}
        />
        <NumberField
          short="Col"
          spec={{ prop: "column-gap", label: "Column gap", edit, min: 0 }}
        />
      </div>
    );
  }
  if (auto) return null;
  return (
    <NumberField
      short="Gap"
      spec={{ prop: "gap", label: "Gap", edit, min: 0 }}
    />
  );
}

function GridControls({ edit }: { edit: DirectEdit }) {
  return (
    <div className="ins-flex">
      <AlignGrid edit={edit} isRow grid />
      <div className="ins-flex-side">
        <GapFields edit={edit} split auto={false} />
      </div>
    </div>
  );
}

function FlexControls({ edit }: { edit: DirectEdit }) {
  const direction = edit.values["flex-direction"].startsWith("column")
    ? "column"
    : "row";
  const wraps =
    edit.values["flex-wrap"] === "wrap" ||
    edit.values["flex-wrap"] === "wrap-reverse";
  const auto = edit.values["justify-content"] === "space-between";
  return (
    <div className="ins-flex">
      <AlignGrid edit={edit} isRow={direction === "row"} />
      <div className="ins-flex-side">
        <div className="ins-flex-row">
          <div
            className="segmented icons ins-direction"
            role="group"
            aria-label="Direction"
          >
            {DIRECTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={direction === option.value ? "on" : ""}
                aria-label={option.label}
                aria-pressed={direction === option.value}
                data-tip={option.label}
                onClick={() => write(edit, { "flex-direction": option.value })}
              >
                <Icon name={option.icon} size={14} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn ins-toggle"
            aria-label="Wrap"
            aria-pressed={wraps}
            data-tip={wraps ? "Wrap: on" : "Wrap: off"}
            onClick={() =>
              write(edit, { "flex-wrap": wraps ? "nowrap" : "wrap" })
            }
          >
            <Icon name="wrap" size={14} />
          </button>
        </div>
        <GapModeField edit={edit} />
        <GapFields edit={edit} split={wraps} auto={auto} />
      </div>
    </div>
  );
}

function AutoLayoutSection({
  edit,
  title = "Auto layout",
  lead,
  children,
}: {
  edit: DirectEdit;
  title?: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const flex = isFlexDisplay(edit.values.display);
  const grid = isGridDisplay(edit.values.display);
  useLayoutKeys(
    root,
    () => {
      if (
        !isFlexDisplay(edit.values.display) &&
        !isGridDisplay(edit.values.display)
      )
        write(edit, { display: "flex" });
    },
    () => {
      if (isFlexDisplay(edit.values.display)) write(edit, { display: "block" });
    }
  );
  const remove = (
    <button
      type="button"
      className="icon-btn small"
      aria-label="Remove auto layout"
      aria-keyshortcuts="Alt+Shift+A"
      data-tip="Remove auto layout ⌥⇧A"
      data-tip-align="end"
      onClick={() => write(edit, { display: "block" })}
    >
      <Icon name="close" size={12} />
    </button>
  );
  return (
    <InspectorSection title={title} aside={flex ? remove : undefined}>
      {lead}
      <div ref={root} className="ins-layout">
        <div className="ins-layout-row">
          <SelectField
            prop="display"
            label="Display"
            short="Display"
            edit={edit}
            options={DISPLAYS}
          />
          {!flex && !grid && (
            <AddButton
              label="Auto layout"
              tip="Add auto layout ⇧A"
              shortcut="Shift+A"
              onClick={() => write(edit, { display: "flex" })}
            />
          )}
        </div>
        {flex && <FlexControls edit={edit} />}
        {grid && <GridControls edit={edit} />}
      </div>
      {children}
    </InspectorSection>
  );
}

export { AutoLayoutSection };
