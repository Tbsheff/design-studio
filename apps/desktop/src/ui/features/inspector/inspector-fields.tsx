import { memo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import type { DirectStyleProperty } from "@design-studio/actions/_core/contracts";
import { colorHex, resolveTokenValue } from "../../../shared/token-match.js";
import { Icon } from "../../kit/Icon.js";
import type { IconName } from "../../kit/Icon.js";
import { UiSelect } from "../../kit/UiSelect.js";
import { readStored, writeStored } from "../../platform/storage.js";
import { TokenControl } from "../versions-layers-tokens/token-control.js";
import { colorToHex, displayColor, isValidColor } from "./css-values.js";
import { useInherited } from "./edit-variant.js";
import { sameEditValues } from "./use-direct-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useTokenUi } from "./use-token-snap.js";

interface FieldProps {
  prop: DirectStyleProperty;
  label: string;
  short: string;
  edit: DirectEdit;
}

const NEUTRAL_SWATCH = "#ffffff";

const sameField = (a: FieldProps, b: FieldProps): boolean =>
  a.prop === b.prop &&
  a.label === b.label &&
  a.short === b.short &&
  sameEditValues(a.edit, b.edit, [a.prop]);

const ColorFieldView = ({ prop, label, short, edit }: FieldProps) => {
  const [text, setText] = useState<string | null>(null);
  const ui = useTokenUi();
  const value = edit.values[prop];
  const resolved = ui ? resolveTokenValue(value, ui.entries, ui.mode) : value;
  const hex = colorToHex(resolved) ?? (ui ? colorHex(resolved) : null);
  const shown = text ?? displayColor(value);
  const inherited = useInherited(prop);

  const settle = () => {
    if (text !== null && !isValidColor(text)) {
      edit.revert([prop]);
    }

    setText(null);
    edit.commit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      settle();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setText(null);
      edit.revert([prop]);
    }
  };

  const id = `ins-${prop}-${label.replaceAll(/\W+/gu, "-").toLowerCase()}`;

  return (
    <div className={`ins-field color ${inherited ? "inherited" : ""}`}>
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <input
        id={id}
        className="ins-input"
        aria-label={label}
        aria-invalid={text !== null && !isValidColor(text)}
        value={shown}
        spellCheck={false}
        autoComplete="off"
        placeholder={edit.mixed.has(prop) ? "Mixed" : "None"}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);

          if (isValidColor(next)) {
            edit.preview({ [prop]: next.trim() });
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={settle}
      />
      <span
        className={`ins-swatch ${hex ? "" : "empty"}`}
        style={{ ["--swatch" as string]: resolved || "transparent" }}
      >
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={hex ?? NEUTRAL_SWATCH}
          onInput={(event) =>
            edit.preview({ [prop]: event.currentTarget.value })
          }
          onChange={(event) => {
            edit.preview({ [prop]: event.currentTarget.value });
            edit.commitSoon();
          }}
        />
      </span>
      <TokenControl prop={prop} label={label} edit={edit} />
    </div>
  );
};

const SelectFieldView = ({
  prop,
  label,
  short,
  edit,
  options,
}: FieldProps & { options: string[] }) => {
  const value = edit.values[prop];

  const list =
    value && !options.includes(value) ? [value, ...options] : options;

  const id = `ins-${prop}`;
  const inherited = useInherited(prop);

  return (
    <div className={`ins-field select ${inherited ? "inherited" : ""}`}>
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <UiSelect
        id={id}
        className="ins-select"
        aria-label={label}
        value={value}
        placeholder={edit.mixed.has(prop) ? "Mixed" : "—"}
        options={list.map((option) => ({ label: option, value: option }))}
        onChange={(next) => {
          edit.preview({ [prop]: next });
          edit.commit();
        }}
      />
    </div>
  );
};

const ALIGN: { value: string; icon: IconName; label: string }[] = [
  { icon: "alignLeft", label: "Align left", value: "left" },
  { icon: "alignCenter", label: "Align center", value: "center" },
  { icon: "alignRight", label: "Align right", value: "right" },
  { icon: "alignJustify", label: "Justify", value: "justify" },
];

const alignOf = (value: string): string => {
  if (value === "start") {
    return "left";
  }

  if (value === "end") {
    return "right";
  }

  return value;
};

const AlignFieldView = ({ edit }: { edit: DirectEdit }) => {
  const current = alignOf(edit.values["text-align"]);

  return (
    <div
      className="segmented icons ins-align"
      role="group"
      aria-label="Text align"
    >
      {ALIGN.map((option) => (
        <button
          key={option.value}
          type="button"
          className={current === option.value ? "on" : ""}
          aria-label={option.label}
          aria-pressed={current === option.value}
          data-tip={option.label}
          onClick={() => {
            edit.preview({ "text-align": option.value });
            edit.commit();
          }}
        >
          <Icon name={option.icon} size={14} />
        </button>
      ))}
    </div>
  );
};

const OPEN_KEY = "studio.inspector.sections";

const readOpen = (): Record<string, boolean> => {
  try {
    const raw: unknown = JSON.parse(readStored(OPEN_KEY) ?? "{}");

    return raw && typeof raw === "object"
      ? (raw as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
};

const sectionOpen = readOpen();

export const useSectionOpen = (
  title: string,
  initial = true
): [boolean, () => void] => {
  const [open, setOpen] = useState(() => sectionOpen[title] ?? initial);

  const toggle = () => {
    const next = !open;
    sectionOpen[title] = next;
    setOpen(next);
    writeStored(OPEN_KEY, JSON.stringify(sectionOpen));
  };

  return [open, toggle];
};

interface SectionProps {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  label?: ReactNode;
  initialOpen?: boolean;
}

export const InspectorSection = ({
  title,
  children,
  aside,
  className,
  label,
  initialOpen,
}: SectionProps) => {
  const [open, toggle] = useSectionOpen(title, initialOpen);

  const hasBody =
    children !== null && children !== undefined && children !== false;

  return (
    <section
      className={`ins-section ${open ? "" : "closed"} ${className ?? ""}`}
      aria-label={title}
    >
      <div className="ins-section-head">
        <h3>
          <button
            type="button"
            className="ins-section-toggle"
            aria-expanded={hasBody ? open : undefined}
            disabled={!hasBody}
            onClick={toggle}
          >
            <Icon name="chevronRight" size={12} />
            <span>{title}</span>
          </button>
        </h3>
        {label}
        {aside}
      </div>
      {open && children}
    </section>
  );
};

export const ColorField = memo(ColorFieldView, sameField);

export const SelectField = memo(
  SelectFieldView,
  (a, b) => sameField(a, b) && a.options.join(",") === b.options.join(",")
);

export const AlignField = memo(AlignFieldView, (a, b) =>
  sameEditValues(a.edit, b.edit, ["text-align"])
);
