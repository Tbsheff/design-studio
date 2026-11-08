import { Icon, UiSelect } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useRef } from "react";
import type { ReactNode, ReactElement } from "react";

import { copy } from "./copy.js";
import { InspectorSection, SelectField } from "./inspector-fields.js";
import { AddButton } from "./inspector-shared.js";
import { write, useLayoutKeys } from "./layout-keys.js";
import { NumberField } from "./number-field.js";
import {
  activeCell,
  alignCell,
  isFlexDisplay,
  isGridDisplay,
} from "./sizing.js";
import type { DirectEdit } from "./use-direct-edit.js";

const DIRECTIONS: {
  readonly value: string;
  readonly icon: IconName;
  readonly label: string;
}[] = [
  { icon: "arrowRight", label: "Horizontal", value: "row" },
  { icon: "arrowDown", label: "Vertical", value: "column" },
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

const gridValue = (value: string): string => {
  if (value === "flex-start") {
    return "start";
  }

  if (value === "flex-end") {
    return "end";
  }

  return value;
};

const AlignGrid = ({
  edit,
  isRow,
  isGrid: grid = false,
}: {
  readonly edit: DirectEdit;
  readonly isRow: boolean;
  readonly isGrid: boolean;
}): ReactElement => {
  const justifyProp = grid ? "justify-items" : "justify-content";

  const active = activeCell(
    edit.values[justifyProp],
    edit.values["align-items"],
    isRow
  );

  return (
    <div className="ins-align-grid" role="group" aria-label={copy.alignment}>
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
                        "align-items": gridValue(cell.align),
                        "justify-items": gridValue(cell.justify),
                      }
                    : {
                        "align-items": cell.align,
                        "justify-content": cell.justify,
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
};

type GapMode = "fixed" | "auto";

const GAP_MODES: { readonly value: GapMode; readonly label: string }[] = [
  { label: "Fixed", value: "fixed" },
  { label: "Auto", value: "auto" },
];

const DEFAULT_GAP = "8px";

const useLastGap = (edit: DirectEdit): string => {
  const last = useRef(
    Number.parseFloat(edit.values.gap) > 0 ? edit.values.gap : DEFAULT_GAP
  );

  if (Number.parseFloat(edit.values.gap) > 0) {
    last.current = edit.values.gap;
  }

  return last.current;
};

const GapModeField = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const mode: GapMode =
    edit.values["justify-content"] === "space-between" ? "auto" : "fixed";

  const lastGap = useLastGap(edit);

  const change = (next: GapMode): void => {
    if (next === mode) {
      return;
    }

    write(
      edit,
      next === "auto"
        ? { gap: "", "justify-content": "space-between" }
        : { gap: lastGap, "justify-content": "" }
    );
  };

  return (
    <div
      className="ins-field select ins-gap-mode"
      data-tip={copy.autoPutsTheSpaceBetween}
      data-tip-align="end"
    >
      <span className="ins-scrub static">{copy.spacing}</span>
      <UiSelect
        className="ins-select"
        aria-label={copy.gapMode}
        value={mode}
        options={GAP_MODES}
        onChange={change}
      />
    </div>
  );
};

const GapFields = ({
  edit,
  isSplit: split,
  isAuto: auto,
}: {
  readonly edit: DirectEdit;
  readonly isSplit: boolean;
  readonly isAuto: boolean;
}): ReactElement | null => {
  if (split) {
    return (
      <div className="ins-gap-pair">
        <NumberField
          short="Row"
          spec={{ edit, label: "Row gap", min: 0, prop: "row-gap" }}
        />
        <NumberField
          short="Col"
          spec={{ edit, label: "Column gap", min: 0, prop: "column-gap" }}
        />
      </div>
    );
  }

  if (auto) {
    return null;
  }

  return (
    <NumberField
      short="Gap"
      spec={{ edit, label: "Gap", min: 0, prop: "gap" }}
    />
  );
};

const GridControls = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => (
  <div className="ins-flex">
    <AlignGrid edit={edit} isRow isGrid />
    <div className="ins-flex-side">
      <GapFields edit={edit} isSplit isAuto={false} />
    </div>
  </div>
);

const FlexControls = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const direction = edit.values["flex-direction"].startsWith("column")
    ? "column"
    : "row";

  const wraps =
    edit.values["flex-wrap"] === "wrap" ||
    edit.values["flex-wrap"] === "wrap-reverse";

  const auto = edit.values["justify-content"] === "space-between";

  return (
    <div className="ins-flex">
      <AlignGrid isGrid={false} edit={edit} isRow={direction === "row"} />
      <div className="ins-flex-side">
        <div className="ins-flex-row">
          <div
            className="segmented icons ins-direction"
            role="group"
            aria-label={copy.direction}
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
            aria-label={copy.wrap}
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
        <GapFields edit={edit} isSplit={wraps} isAuto={auto} />
      </div>
    </div>
  );
};

const AutoLayoutSection = ({
  edit,
  title = "Auto layout",
  lead,
  children,
}: {
  readonly edit: DirectEdit;
  readonly title?: string;
  readonly lead?: ReactNode;
  readonly children?: ReactNode;
}): ReactElement => {
  const root = useRef<HTMLDivElement>(null);
  const flex = isFlexDisplay(edit.values.display);
  const grid = isGridDisplay(edit.values.display);
  useLayoutKeys(
    root,
    () => {
      if (
        !isFlexDisplay(edit.values.display) &&
        !isGridDisplay(edit.values.display)
      ) {
        write(edit, { display: "flex" });
      }
    },
    () => {
      if (isFlexDisplay(edit.values.display)) {
        write(edit, { display: "block" });
      }
    }
  );

  const remove = (
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.removeAutoLayout}
      aria-keyshortcuts="Alt+Shift+A"
      data-tip={copy.removeAutoLayoutA}
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
};

export { AutoLayoutSection };
