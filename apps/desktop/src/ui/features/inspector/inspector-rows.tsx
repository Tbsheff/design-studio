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

function useRowKeys(onCommit: () => void, onRevert: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onRevert();
    }
  };
}

function ContentRow({
  selection,
  edit,
}: {
  readonly selection: SelectionContext;
  readonly edit: DirectEdit;
}): ReactElement {
  const state = textEditability(selection);
  const onKeyDown = useRowKeys(edit.commit, edit.revertText);
  const data = useInspectorApp().element?.textFromData;

  if (data) {
    return <DataTextNote data={data} selection={selection} edit={edit} />;
  }

  if (state !== "ok") {
    return (
      <div className="ins-field wide readonly">
        <span className="ins-scrub static">Content</span>
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
        Content
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
}

const UNSAFE = /[;{}<>\\]/;

function CssTextRow({
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
}): ReactElement {
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
}

function hasLine(value: string, line: string): boolean {
  return value.split(/\s+/).includes(line);
}

function toggleLine(value: string, line: string): string {
  const parts = value
    .split(/\s+/)
    .filter((part) => part !== "" && part !== "none");

  const next = parts.includes(line)
    ? parts.filter((part) => part !== line)
    : [...parts, line];

  return next.length === 0 ? "none" : next.join(" ");
}

function TextStyleTogglesView({
  edit,
}: {
  readonly edit: DirectEdit;
}): ReactElement {
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
      glyph: <em>I</em>,
      key: "i",
      label: "Italic",
      on: italic,
      run: () => write({ "font-style": italic ? "normal" : "italic" }),
    },
    {
      glyph: <u>U</u>,
      key: "u",
      label: "Underline",
      on: hasLine(decoration, "underline"),
      run: () =>
        write({ "text-decoration-line": toggleLine(decoration, "underline") }),
    },
    {
      glyph: <s>S</s>,
      key: "s",
      label: "Strikethrough",
      on: hasLine(decoration, "line-through"),
      run: () =>
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
}

const TextStyleToggles = memo(TextStyleTogglesView, (a, b) =>
  isSameEditValues(a.edit, b.edit, ["font-style", "text-decoration-line"])
);

export { ContentRow, CssTextRow, TextStyleToggles };
