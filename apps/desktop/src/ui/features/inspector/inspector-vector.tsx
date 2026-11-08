import type { SelectionContext } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";
import { startTransition, useState } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import {
  BOOLEAN_OPS,
  VECTOR_COLOR,
  isSvgShapeTag,
} from "../../../shared/vector.js";
import type {
  BooleanOpName,
  VectorPaint,
  VectorRequest,
} from "../../../shared/vector.js";
import { errorText } from "../../api.js";
import { runVector } from "../canvas/vector-tool-model.js";
import { copy } from "./copy.js";
import { colorToHex } from "./css-values.js";
import { InspectorSection } from "./inspector-section.js";

import "../../styles/vector.css";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly isEditable: boolean;
}

const SHAPE_TAG = /<(path|rect|circle|ellipse|polygon|polyline|line)\b[^>]*>/iu;

const BOOLEAN_LABEL: Record<BooleanOpName, string> = {
  exclude: "Exclude",
  intersect: "Intersect",
  subtract: "Subtract",
  union: "Union",
};

const BOOLEAN_TIP: Record<BooleanOpName, string> = {
  exclude: "Exclude: keep only where they do not overlap",
  intersect: "Intersect: keep only where they overlap",
  subtract: "Subtract: cut the second shape out of the first",
  union: "Union: join the two shapes into one path",
};

const BOOLEAN_GLYPH: Record<
  BooleanOpName,
  {
    readonly first: string;
    readonly second: string;
    readonly fill: "a" | "b" | "both" | "cut";
  }
> = {
  exclude: {
    first: "M2.5 2.5h7v7h-7z",
    second: "M6.5 6.5h7v7h-7z",
    fill: "both",
  },
  intersect: {
    first: "M2.5 2.5h7v7h-7z",
    second: "M6.5 6.5h7v7h-7z",
    fill: "cut",
  },
  subtract: {
    first: "M2.5 2.5h7v7h-7z",
    second: "M6.5 6.5h7v7h-7z",
    fill: "a",
  },
  union: {
    first: "M2.5 2.5h7v7h-7z",
    second: "M6.5 6.5h7v7h-7z",
    fill: "both",
  },
};

const attrOf = (tag: string, name: string): string | null => {
  const attr = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1];

  if (attr !== undefined) {
    return attr;
  }

  const style = /\sstyle="([^"]*)"/iu.exec(tag)?.[1] ?? "";

  return (
    new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, "i")
      .exec(style)?.[1]
      ?.trim() ?? null
  );
};

const paintOf = (
  selection: SelectionContext
): {
  readonly fill: string;
  readonly stroke: string;
  readonly width: string;
} => {
  const html = selection.outerHTML;
  const own = /^<[^>]*>/u.exec(html)?.[0] ?? "";

  const shape =
    selection.tag.toLowerCase() === "svg"
      ? (SHAPE_TAG.exec(html.slice(own.length))?.[0] ?? own)
      : own;

  const pick = (name: string): string =>
    attrOf(shape, name) ?? attrOf(own, name) ?? "";

  return {
    fill: pick("fill"),
    stroke: pick("stroke"),
    width: pick("stroke-width"),
  };
};

const targetOf = (selection: SelectionContext): InsertTarget => ({
  selector: selection.selector,
  source: selection.source,
  tag: selection.tag.toLowerCase(),
});

const ColorRow = ({
  label,
  value,
  isDisabled: disabled,
  onSave,
}: {
  readonly label: string;
  readonly value: string;
  readonly isDisabled: boolean;
  readonly onSave: (value: string | null) => void;
}): ReactElement => {
  const [text, setText] = useState<string | null>(null);

  const shown =
    text ??
    (/^#[0-9a-f]+$/iu.test(value) ? value.toLowerCase() : value || "none");

  const valid = (raw: string): boolean =>
    raw.trim() === "" || VECTOR_COLOR.test(raw.trim());

  const settle = (): void => {
    if (text === null) {
      return;
    }

    const next = text.trim();
    setText(null);

    if (!valid(next) || next.toLowerCase() === value.toLowerCase()) {
      return;
    }

    onSave(next === "" || next === "none" ? null : next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      settle();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setText(null);
    }
  };

  const hex = colorToHex(value) ?? "#ffffff";
  const id = `vector-${label.toLowerCase()}`;

  return (
    <div className="ins-field color">
      <label htmlFor={id} className="ins-scrub static">
        {label}
      </label>
      <input
        id={id}
        className="ins-input"
        aria-label={label}
        aria-invalid={text !== null && !valid(text)}
        value={shown}
        spellCheck={false}
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={settle}
      />
      <span
        className={`ins-swatch ${value && value !== "none" ? "" : "empty"}`}
        style={{
          ["--swatch" as string]:
            value && value !== "none" ? value : "transparent",
        }}
      >
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={hex}
          disabled={disabled}
          onChange={(event) => onSave(event.currentTarget.value)}
        />
      </span>
    </div>
  );
};

const WidthRow = ({
  value,
  isDisabled: disabled,
  onSave,
}: {
  readonly value: string;
  readonly isDisabled: boolean;
  readonly onSave: (value: number | null) => void;
}): ReactElement => {
  const [text, setText] = useState<string | null>(null);

  const settle = (): void => {
    if (text === null) {
      return;
    }

    const next = text.trim();
    setText(null);

    if (next === value) {
      return;
    }

    const width = Number.parseFloat(next);

    if (next === "") {
      onSave(null);
    } else if (Number.isFinite(width) && width >= 0) {
      onSave(width);
    }
  };

  return (
    <div className="ins-field">
      <label htmlFor="vector-stroke-width" className="ins-scrub static">
        {copy.weight}
      </label>
      <input
        id="vector-stroke-width"
        className="ins-input"
        aria-label={copy.strokeWidth}
        inputMode="decimal"
        value={text ?? value}
        placeholder="0"
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && settle()}
        onBlur={settle}
      />
    </div>
  );
};

const BooleanGlyph = ({ op }: { readonly op: BooleanOpName }): ReactElement => {
  const glyph = BOOLEAN_GLYPH[op];

  const filled = (which: "a" | "b"): boolean =>
    glyph.fill === "both" || glyph.fill === which;

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path
        d={glyph.first}
        fill={filled("a") ? "currentColor" : "none"}
        fillOpacity={0.35}
      />
      <path
        d={glyph.second}
        fill={filled("b") ? "currentColor" : "none"}
        fillOpacity={op === "subtract" ? 0 : 0.35}
      />
      {glyph.fill === "cut" && (
        <path d="M6.5 6.5h3v3h-3z" fill="currentColor" stroke="none" />
      )}
      {op === "exclude" && (
        <path d="M6.5 6.5h3v3h-3z" fill="var(--surface-raised)" stroke="none" />
      )}
    </svg>
  );
};

const useRun = (
  props: Props
): {
  readonly isBusy: boolean;
  readonly error: string | null;
  readonly run: (request: VectorRequest) => Promise<boolean>;
} => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (request: VectorRequest): Promise<boolean> => {
    if (!props.directionId) {
      return false;
    }

    setBusy(true);
    setError(null);

    try {
      await runVector(props.projectId, props.directionId, request);

      return true;
    } catch (failure) {
      setError(errorText(failure));

      return false;
    } finally {
      setBusy(false);
    }
  };

  return { error, isBusy: busy, run };
};

const PaintRows = ({
  props,
  target,
}: {
  readonly props: Props;
  readonly target: SelectionContext;
}): ReactElement => {
  const { error, isBusy: busy, run } = useRun(props);
  const [saved, setSaved] = useState<Partial<ReturnType<typeof paintOf>>>({});
  const paint = { ...paintOf(target), ...saved };
  const disabled = busy || !props.isEditable;

  const save = (change: VectorPaint): void => {
    startTransition(async () => {
      const ok = await run({
        op: "paint",
        target: targetOf(target),
        ...change,
      });

      if (!ok) {
        return;
      }

      setSaved((prev) => ({
        ...prev,
        ...(change.fill === undefined ? {} : { fill: change.fill ?? "none" }),
        ...(change.stroke === undefined
          ? {}
          : { stroke: change.stroke ?? "none" }),
        ...(change.strokeWidth === undefined
          ? {}
          : {
              width:
                change.strokeWidth === null ? "" : String(change.strokeWidth),
            }),
      }));
    });
  };

  return (
    <InspectorSection title={copy.fillAndStroke} modifier="vector-paint">
      <div className="ins-grid">
        <div className="wide">
          <ColorRow
            label="Fill"
            value={paint.fill}
            isDisabled={disabled}
            onSave={(fill) => save({ fill })}
          />
        </div>
        <ColorRow
          label="Stroke"
          value={paint.stroke}
          isDisabled={disabled}
          onSave={(stroke) => save({ stroke })}
        />
        <WidthRow
          value={paint.width}
          isDisabled={disabled}
          onSave={(strokeWidth) => save({ strokeWidth })}
        />
      </div>
      {error && (
        <p className="ins-error" role="alert">
          {error}
        </p>
      )}
    </InspectorSection>
  );
};

const BooleanRow = ({ props }: { readonly props: Props }): ReactElement => {
  const { error, isBusy: busy, run } = useRun(props);

  const [first, second] = props.selection as [
    SelectionContext,
    SelectionContext,
  ];

  const go = (op: BooleanOpName): undefined =>
    void run({
      boolean: op,
      op: "boolean",
      rects: [first.rect, second.rect],
      targets: [targetOf(first), targetOf(second)],
    });

  return (
    <InspectorSection title={copy.boolean}>
      <div
        className="segmented icons vector-boolean"
        role="group"
        aria-label={copy.boolean}
      >
        {BOOLEAN_OPS.map((op) => (
          <button
            key={op}
            type="button"
            aria-label={BOOLEAN_LABEL[op]}
            data-tip={BOOLEAN_TIP[op]}
            disabled={busy || !props.isEditable}
            onClick={() => go(op)}
          >
            <BooleanGlyph op={op} />
          </button>
        ))}
      </div>
      {error && (
        <p className="ins-error" role="alert">
          {error}
        </p>
      )}
    </InspectorSection>
  );
};

export default function InspectorVector(props: Props): ReactElement | null {
  if (
    !props.directionId ||
    props.selection.length > 2 ||
    !props.selection.every((item) => isSvgShapeTag(item.tag) && item.source)
  ) {
    return null;
  }

  const only = props.selection.length === 1 ? props.selection[0] : undefined;

  return (
    <div className="vector-inspector">
      {only ? (
        <PaintRows
          key={`${only.selector}|${only.outerHTML.length}`}
          props={props}
          target={only}
        />
      ) : (
        <BooleanRow props={props} />
      )}
    </div>
  );
}
