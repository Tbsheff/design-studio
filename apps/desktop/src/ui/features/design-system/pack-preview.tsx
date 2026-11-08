import { REQUIRED_TOKENS } from "@design-studio/contracts";
import type { CompiledTokenEntry, PackSummary } from "@design-studio/contracts";
import type { CSSProperties, ReactElement } from "react";

import { COPY } from "./copy.js";

type Mode = "light" | "dark";

const varsFor = (entries: CompiledTokenEntry[], mode: Mode): CSSProperties => {
  const vars: Record<string, string> = {};

  for (const entry of entries) {
    vars[entry.cssVar] =
      mode === "dark" ? (entry.darkValue ?? entry.value) : entry.value;
  }

  return vars as CSSProperties;
};

const Palette = (): ReactElement => (
  <ul className="pv-palette" aria-label={COPY.labelColors}>
    {REQUIRED_TOKENS.color.map((name) => (
      <li key={name} className="pv-color">
        <span
          className="pv-chip"
          style={{ background: `var(--${name})` }}
          aria-hidden="true"
        />
        <span>{name}</span>
      </li>
    ))}
  </ul>
);

const Components = ({ name }: { name: string }): ReactElement => (
  <div className="pv-components">
    <div className="pv-card">
      <h4>{name}</h4>
      <p>{COPY.textCardsTextAndControls}</p>
      <div className="pv-row">
        <span className="pv-btn primary">{COPY.textPrimary}</span>
        <span className="pv-btn accent">{COPY.textAccent}</span>
        <span className="pv-btn outline">{COPY.labelOutline}</span>
      </div>
      <span className="pv-input">{COPY.textNameExampleCom}</span>
    </div>
    <div className="pv-alerts">
      <span className="pv-alert" style={{ borderColor: "var(--success)" }}>
        <span
          className="pv-dot"
          style={{ background: "var(--success)" }}
          aria-hidden="true"
        />
        {COPY.textSaved}
      </span>
      <span className="pv-alert" style={{ borderColor: "var(--warning)" }}>
        <span
          className="pv-dot"
          style={{ background: "var(--warning)" }}
          aria-hidden="true"
        />
        {COPY.textCheckThis}
      </span>
      <span className="pv-alert" style={{ borderColor: "var(--danger)" }}>
        <span
          className="pv-dot"
          style={{ background: "var(--danger)" }}
          aria-hidden="true"
        />
        {COPY.textCouldNotSave}
      </span>
    </div>
  </div>
);

const Surface = ({
  entries,
  mode,
  label,
  name,
}: {
  entries: CompiledTokenEntry[];
  mode: Mode;
  label: string;
  name: string;
}): ReactElement => (
  <section
    className="pv-surface"
    style={varsFor(entries, mode)}
    aria-label={label}
    data-mode={mode}
  >
    <span className="pv-label">{label}</span>
    <Palette />
    <Components name={name} />
  </section>
);

const TYPE_STEPS = ["4xl", "2xl", "xl", "base", "sm"] as const;

const TypeScale = ({
  entries,
}: {
  entries: CompiledTokenEntry[];
}): ReactElement => (
  <section
    className="pv-surface pv-type"
    style={varsFor(entries, "light")}
    aria-label={COPY.labelTypeScale}
  >
    <span className="pv-label">{COPY.textType}</span>
    {TYPE_STEPS.map((step, index) => (
      <div key={step} className="pv-type-row">
        <code>{step}</code>
        <span
          style={{
            fontFamily: index < 2 ? "var(--font-display)" : "var(--font-body)",
            fontSize: `var(--text-${step})`,
          }}
        >
          {COPY.textTheQuickBrownFox}
        </span>
      </div>
    ))}
    <div className="pv-type-row">
      <code>{COPY.textMono}</code>
      <span
        style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}
      >
        {COPY.textConstTokenVarPrimary}
      </span>
    </div>
  </section>
);

const PackPreview = ({
  pack,
  entries,
}: {
  pack: PackSummary;
  entries: CompiledTokenEntry[];
}): ReactElement => {
  const dual =
    pack.mode === "light" && entries.some((entry) => entry.darkValue !== null);

  return (
    <div className="pv">
      <div className={`pv-modes ${dual ? "two" : ""}`}>
        <Surface
          entries={entries}
          mode="light"
          label={dual ? "Light" : pack.mode === "dark" ? "Dark" : "Light"}
          name={pack.name}
        />
        {dual && (
          <Surface
            entries={entries}
            mode="dark"
            label="Dark"
            name={pack.name}
          />
        )}
      </div>
      <TypeScale entries={entries} />
    </div>
  );
};

export { PackPreview };
