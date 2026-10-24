export function contextWindowFor(model: string): number {
  return /\[1m\]|-1m\b/i.test(model) ? 1_000_000 : 200_000;
}

export function contextShare(tokens: number, model: string): number {
  return Math.min(1, Math.max(0, tokens / contextWindowFor(model)));
}

const R = 6;
const C = 2 * Math.PI * R;

export function ContextMeter({ tokens, model }: { tokens: number | null; model: string }) {
  if (tokens === null || tokens <= 0) return null;
  const share = contextShare(tokens, model);
  const percent = Math.round(share * 100);
  const window = contextWindowFor(model);
  const tone = share >= 0.9 ? 'danger' : share >= 0.7 ? 'warn' : '';
  return (
    <span
      className={`context-meter ${tone}`}
      role="meter"
      aria-label="Context used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-testid="context-meter"
      data-tokens={tokens}
      data-tip={`${tokens.toLocaleString()} of ${window.toLocaleString()} tokens in context`}
      data-tip-side="top"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r={R} className="context-track" />
        <circle cx="8" cy="8" r={R} className="context-fill" strokeDasharray={`${C * share} ${C}`} transform="rotate(-90 8 8)" />
      </svg>
      <span className="tabular-nums">{percent}%</span>
    </span>
  );
}
