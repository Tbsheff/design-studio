import type { DirectStyleProperty } from "@design-studio/contracts";
import { Icon, UiSelect } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { memo, useState } from "react";
import type { KeyboardEvent, ReactNode, ReactElement } from "react";

import { colorHex, resolveTokenValue } from "../../../shared/token-match.js";
import { readStored, writeStored } from "../../platform/storage.js";
import { TokenControl } from "../versions-layers-tokens/token-control.js";
import { copy } from "./copy.js";
import { colorToHex, displayColor, isValidColor } from "./css-values.js";
import { isInherited, useVariantScope } from "./edit-variant.js";
import { isSameEditValues } from "./use-direct-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useTokenUi } from "./use-token-snap.js";

interface FieldProps {
  readonly prop: DirectStyleProperty;
  readonly label: string;
  readonly short: string;
  readonly edit: DirectEdit;
}

const NEUTRAL_SWATCH = "#ffffff";

const isSameField = (a: FieldProps, b: FieldProps): boolean =>
  a.prop === b.prop &&
  a.label === b.label &&
  a.short === b.short &&
  isSameEditValues(a.edit, b.edit, [a.prop]);

const ColorFieldView = ({
  prop,
  label,
  short,
  edit,
}: FieldProps): ReactElement => {
  const [text, setText] = useState<string | null>(null);
  const ui = useTokenUi();
  const value = edit.values[prop];
  const resolved = ui ? resolveTokenValue(value, ui.entries, ui.mode) : value;
  const hex = colorToHex(resolved) ?? (ui ? colorHex(resolved) : null);
  const shown = text ?? displayColor(value);
  const inherited = isInherited(useVariantScope(), prop);

  const settle = (): void => {
    if (text !== null && !isValidColor(text)) {
      edit.revert([prop]);
    }

    setText(null);
    edit.commit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
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
}: FieldProps & { readonly options: string[] }): ReactElement => {
  const value = edit.values[prop];

  const list =
    value && !options.includes(value) ? [value, ...options] : options;

  const id = `ins-${prop}`;
  const inherited = isInherited(useVariantScope(), prop);

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

const ALIGN: {
  readonly value: string;
  readonly icon: IconName;
  readonly label: string;
}[] = [
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

const AlignFieldView = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const current = alignOf(edit.values["text-align"]);

  return (
    <div
      className="segmented icons ins-align"
      role="group"
      aria-label={copy.textAlign}
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

const useSectionOpen = (
  title: string,
  initial = true
): [boolean, () => void] => {
  const [open, setOpen] = useState(() => sectionOpen[title] ?? initial);

  const toggle = (): void => {
    const next = !open;
    sectionOpen[title] = next;
    setOpen(next);
    writeStored(OPEN_KEY, JSON.stringify(sectionOpen));
  };

  return [open, toggle];
};

interface SectionProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly aside?: ReactNode;
  readonly className?: string;
  readonly label?: ReactNode;
}

const InspectorSection = ({
  title,
  children,
  aside,
  className,
  label,
}: SectionProps): ReactElement => {
  const [open, toggle] = useSectionOpen(title);

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

const ColorField = memo(ColorFieldView, isSameField);

const SelectField = memo(
  SelectFieldView,
  (a, b) => isSameField(a, b) && a.options.join(",") === b.options.join(",")
);

const AlignField = memo(AlignFieldView, (a, b) =>
  isSameEditValues(a.edit, b.edit, ["text-align"])
);

export {
  useSectionOpen,
  InspectorSection,
  ColorField,
  SelectField,
  AlignField,
};
