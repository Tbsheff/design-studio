import type {
  DirectStyleProperty,
  SelectionContext,
} from "@design-studio/contracts";
import { memo, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { textEditability } from "./css-values.js";
import { DataTextNote, useInspectorApp } from "./inspector-shared.js";
import { isSameEditValues } from "./use-direct-edit.js";
import type { DirectEdit } from "./use-direct-edit.js";

const useRowKeys =
  (onCommit: () => void, onRevert: () => void) =>
  (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onRevert();
    }
  };

const ContentRow = ({
  selection,
  edit,
}: {
  readonly selection: SelectionContext;
  readonly edit: DirectEdit;
}): ReactElement => {
  const state = textEditability(selection);
  const onKeyDown = useRowKeys(edit.commit, edit.revertText);
  const data = useInspectorApp().element?.textFromData;

  if (data) {
    return <DataTextNote data={data} selection={selection} edit={edit} />;
  }

  if (state !== "ok") {
    return (
      <div className="ins-field wide readonly">
        <span className="ins-scrub static">{copy.content}</span>
        <span className="ins-value">
          {state === "children"
            ? "Has child elements"
            : "Too long to edit here"}
        </span>
      </div>
    );
  }

  return (
    <div className="ins-field wide">
      <label htmlFor="ins-content" className="ins-scrub static">
        {copy.content}
      </label>
      <input
        id="ins-content"
        className="ins-input"
        aria-label={copy.textContent}
        value={edit.text}
        spellCheck={false}
        data-tip={edit.text}
        onChange={(event) => edit.previewText(event.target.value)}
        onBlur={edit.commit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

const UNSAFE = /[;{}<>\\]/;

const CssTextRow = ({
  prop,
  label,
  short,
  edit,
  placeholder,
}: {
  readonly prop: DirectStyleProperty;
  readonly label: string;
  readonly short: string;
  readonly edit: DirectEdit;
  readonly placeholder: string;
}): ReactElement => {
  const [text, setText] = useState<string | null>(null);
  const value = edit.values[prop];
  const shown = text ?? (value === "none" ? "" : value);
  const id = `ins-${prop}`;

  const commit = (): void => {
    if (text !== null) {
      const next = text.trim();

      if (UNSAFE.test(next)) {
        edit.revert([prop]);
      } else {
        edit.preview({ [prop]: next === "" ? "none" : next });
      }
    }

    setText(null);
    edit.commit();
  };

  const onKeyDown = useRowKeys(commit, () => {
    setText(null);
    edit.revert([prop]);
  });

  return (
    <div className="ins-field wide">
      <label htmlFor={id} className="ins-scrub static">
        {short}
      </label>
      <input
        id={id}
        className="ins-input mono"
        aria-label={label}
        value={shown}
        spellCheck={false}
        autoComplete="off"
        placeholder={edit.mixed.has(prop) ? "Mixed" : placeholder}
        onChange={(event) => {
          setText(event.target.value);
          const next = event.target.value.trim();

          if (next !== "" && !UNSAFE.test(next)) {
            edit.preview({ [prop]: next });
          }
        }}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  );
};

const hasLine = (value: string, line: string): boolean =>
  value.split(/\s+/).includes(line);

const toggleLine = (value: string, line: string): string => {
  const parts = value
    .split(/\s+/)
    .filter((part) => part !== "" && part !== "none");

  const next = parts.includes(line)
    ? parts.filter((part) => part !== line)
    : [...parts, line];

  return next.length === 0 ? "none" : next.join(" ");
};

const TextStyleTogglesView = ({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement => {
  const italic =
    edit.values["font-style"] === "italic" ||
    edit.values["font-style"] === "oblique";

  const decoration = edit.values["text-decoration-line"];

  const write = (patch: Partial<Record<DirectStyleProperty, string>>): void => {
    edit.preview(patch);
    edit.commit();
  };

  const items = [
    {
      glyph: <em>{copy.glyphItalic}</em>,
      key: "i",
      label: "Italic",
      on: italic,
      run: (): void => write({ "font-style": italic ? "normal" : "italic" }),
    },
    {
      glyph: <u>{copy.glyphUnderline}</u>,
      key: "u",
      label: "Underline",
      on: hasLine(decoration, "underline"),
      run: (): void =>
        write({ "text-decoration-line": toggleLine(decoration, "underline") }),
    },
    {
      glyph: <s>{copy.glyphStrikethrough}</s>,
      key: "s",
      label: "Strikethrough",
      on: hasLine(decoration, "line-through"),
      run: (): void =>
        write({
          "text-decoration-line": toggleLine(decoration, "line-through"),
        }),
    },
  ];

  return (
    <div
      className="ins-field ins-toggles"
      role="group"
      aria-label={copy.textStyle}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.on ? "on" : ""}
          aria-label={item.label}
          aria-pressed={item.on}
          data-tip={item.label}
          onClick={item.run}
        >
          {item.glyph}
        </button>
      ))}
    </div>
  );
};

const TextStyleToggles = memo(TextStyleTogglesView, (first, second) =>
  isSameEditValues(first.edit, second.edit, [
    "font-style",
    "text-decoration-line",
  ])
);

export { ContentRow, CssTextRow, TextStyleToggles };
