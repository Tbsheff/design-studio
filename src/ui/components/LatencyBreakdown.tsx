import { useEffect, useState } from 'react';
import type { TelemetrySample } from '../../shared/contracts';
import { api } from '../api';
import { formatMs } from '../format';
import type { RunView } from '../runState';

const FILE_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);
const PREVIEW_GRACE_MS = 15_000;

function fileWriteMs(run: RunView): number {
  return run.tools.reduce((sum, t) => (FILE_WRITE_TOOLS.has(t.name) && !t.isError ? sum + (t.durationMs ?? 0) : sum), 0);
}

function firstWriteAt(run: RunView): number | null {
  const starts = run.tools.filter((t) => FILE_WRITE_TOOLS.has(t.name)).map((t) => t.startedAt);
  return starts.length > 0 ? Math.min(...starts) : null;
}

function previewSamplesForRun(samples: TelemetrySample[], run: RunView): TelemetrySample[] {
  const from = firstWriteAt(run);
  const finishedAt = run.summary?.finishedAt ?? null;
  if (from === null || finishedAt === null) return [];
  return samples.filter(
    (s) =>
      s.kind === 'preview.latency' &&
      (s.directionId === undefined || s.directionId === run.directionId) &&
      s.ts >= from &&
      s.ts <= finishedAt + PREVIEW_GRACE_MS,
  );
}

function previewText(samples: TelemetrySample[] | null): string {
  if (samples === null) return 'loading';
  if (samples.length === 0) return 'n/a';
  const last = samples[samples.length - 1] as TelemetrySample;
  const max = Math.max(...samples.map((s) => s.ms));
  return samples.length === 1 ? formatMs(last.ms) : `${formatMs(last.ms)} last, ${formatMs(max)} max (${samples.length} updates)`;
}

export function LatencyBreakdown({ projectId, run }: { projectId: string; run: RunView }) {
  const [samples, setSamples] = useState<TelemetrySample[] | null>(null);
  const finishedAt = run.summary?.finishedAt ?? null;

  useEffect(() => {
    let alive = true;
    api
      .getTelemetry(projectId)
      .then((list) => alive && setSamples(previewSamplesForRun(list, run)))
      .catch(() => alive && setSamples([]));
    return () => {
      alive = false;
    };
  }, [projectId, run.runId, finishedAt]);

  const s = run.summary;
  if (!s) return null;
  const rows: [string, string][] = [
    ['Model', formatMs(s.modelMs)],
    ['Tools', formatMs(s.toolMs)],
    ['File writes', formatMs(fileWriteMs(run))],
    ['Preview update', previewText(samples)],
  ];
  return (
    <>
      <h4>Latency</h4>
      <dl className="kv" aria-label="Latency breakdown">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
