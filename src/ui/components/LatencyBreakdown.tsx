import { useEffect, useState } from 'react';
import type { TelemetrySample } from '../../shared/contracts';
import { api } from '../api';
import { formatMs } from '../format';
import type { RunView } from '../runState';

const FILE_WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);
const PREVIEW_GRACE_MS = 15_000;
const LONG_FRAME_FLUSH_GRACE_MS = 6000;

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

function firstTokenText(samples: TelemetrySample[] | null, runId: string): string {
  if (samples === null) return 'loading';
  const ofRun = samples.filter((s) => s.kind === 'run.first_token' && s.detail?.runId === runId);
  const visible = ofRun.find((s) => s.detail?.stage === 'visible');
  const server = ofRun.find((s) => s.detail?.stage === 'server');
  if (!visible && !server) return 'n/a';
  if (visible && server) return `${formatMs(visible.ms)} (server ${formatMs(server.ms)})`;
  return formatMs((visible ?? server)?.ms ?? 0);
}

function longFramesText(samples: TelemetrySample[] | null, run: RunView): string {
  if (samples === null) return 'loading';
  const finishedAt = run.summary?.finishedAt ?? null;
  if (finishedAt === null) return 'n/a';
  const during = samples.filter((s) => s.kind === 'frame.long' && s.ts >= run.startedAt && s.ts <= finishedAt + LONG_FRAME_FLUSH_GRACE_MS);
  const count = during.reduce((sum, s) => sum + (typeof s.detail?.count === 'number' ? s.detail.count : 1), 0);
  if (count === 0) return 'none';
  return `${count}, longest ${formatMs(Math.max(...during.map((s) => s.ms)))}`;
}

export function LatencyBreakdown({ projectId, run }: { projectId: string; run: RunView }) {
  const [samples, setSamples] = useState<TelemetrySample[] | null>(null);
  const finishedAt = run.summary?.finishedAt ?? null;

  useEffect(() => {
    let alive = true;
    api
      .getTelemetry(projectId)
      .then((list) => alive && setSamples(list))
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
    ['First token', firstTokenText(samples, run.runId)],
    ['Preview update', previewText(samples === null ? null : previewSamplesForRun(samples, run))],
    ['Long frames', longFramesText(samples, run)],
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
