import type { CSSProperties } from 'react';
import { REQUIRED_TOKENS, type CompiledTokenEntry, type PackSummary } from '../../shared/contracts';

type Mode = 'light' | 'dark';

function varsFor(entries: CompiledTokenEntry[], mode: Mode): CSSProperties {
  const vars: Record<string, string> = {};
  for (const entry of entries) vars[entry.cssVar] = mode === 'dark' ? (entry.darkValue ?? entry.value) : entry.value;
  return vars as CSSProperties;
}

function Palette() {
  return (
    <ul className="pv-palette" aria-label="Colors">
      {REQUIRED_TOKENS.color.map((name) => (
        <li key={name} className="pv-color">
          <span className="pv-chip" style={{ background: `var(--${name})` }} aria-hidden="true" />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  );
}

function Components({ name }: { name: string }) {
  return (
    <div className="pv-components">
      <div className="pv-card">
        <h4>{name}</h4>
        <p>Cards, text and controls take every value from the tokens.</p>
        <div className="pv-row">
          <span className="pv-btn primary">Primary</span>
          <span className="pv-btn accent">Accent</span>
          <span className="pv-btn outline">Outline</span>
        </div>
        <span className="pv-input">name@example.com</span>
      </div>
      <div className="pv-alerts">
        <span className="pv-alert" style={{ borderColor: 'var(--success)' }}>
          <span className="pv-dot" style={{ background: 'var(--success)' }} aria-hidden="true" />
          Saved
        </span>
        <span className="pv-alert" style={{ borderColor: 'var(--warning)' }}>
          <span className="pv-dot" style={{ background: 'var(--warning)' }} aria-hidden="true" />
          Check this
        </span>
        <span className="pv-alert" style={{ borderColor: 'var(--danger)' }}>
          <span className="pv-dot" style={{ background: 'var(--danger)' }} aria-hidden="true" />
          Could not save
        </span>
      </div>
    </div>
  );
}

function Surface({ entries, mode, label, name }: { entries: CompiledTokenEntry[]; mode: Mode; label: string; name: string }) {
  return (
    <section className="pv-surface" style={varsFor(entries, mode)} aria-label={label} data-mode={mode}>
      <span className="pv-label">{label}</span>
      <Palette />
      <Components name={name} />
    </section>
  );
}

const TYPE_STEPS = ['4xl', '2xl', 'xl', 'base', 'sm'] as const;

function TypeScale({ entries }: { entries: CompiledTokenEntry[] }) {
  return (
    <section className="pv-surface pv-type" style={varsFor(entries, 'light')} aria-label="Type scale">
      <span className="pv-label">Type</span>
      {TYPE_STEPS.map((step, index) => (
        <div key={step} className="pv-type-row">
          <code>{step}</code>
          <span style={{ fontSize: `var(--text-${step})`, fontFamily: index < 2 ? 'var(--font-display)' : 'var(--font-body)' }}>The quick brown fox</span>
        </div>
      ))}
      <div className="pv-type-row">
        <code>mono</code>
        <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>const token = 'var(--primary)';</span>
      </div>
    </section>
  );
}

export function PackPreview({ pack, entries }: { pack: PackSummary; entries: CompiledTokenEntry[] }) {
  const dual = pack.mode === 'light' && entries.some((entry) => entry.darkValue !== null);
  return (
    <div className="pv">
      <div className={`pv-modes ${dual ? 'two' : ''}`}>
        <Surface entries={entries} mode="light" label={dual ? 'Light' : pack.mode === 'dark' ? 'Dark' : 'Light'} name={pack.name} />
        {dual && <Surface entries={entries} mode="dark" label="Dark" name={pack.name} />}
      </div>
      <TypeScale entries={entries} />
    </div>
  );
}
