import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { StudioEvent, StudioEventInput } from '../../shared/contracts.js';
import type { EventBus } from '../types.js';
import { assertSafeId } from './errors.js';

const RING_SIZE = 5000;

interface ProjectLog {
  lastSeq: number;
  ring: StudioEvent[];
  listeners: Set<(event: StudioEvent) => void>;
}

function parseLines(text: string): StudioEvent[] {
  const events: StudioEvent[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      events.push(JSON.parse(line) as StudioEvent);
    } catch {
      continue;
    }
  }
  return events;
}

export function createEventBus(dataDir: string): EventBus {
  const logs = new Map<string, ProjectLog>();

  const eventsFile = (projectId: string): string =>
    path.join(dataDir, 'projects', assertSafeId(projectId, 'projectId'), 'events.jsonl');

  const readFileEvents = (projectId: string): StudioEvent[] => {
    const file = eventsFile(projectId);
    if (!existsSync(file)) return [];
    return parseLines(readFileSync(file, 'utf8'));
  };

  const logFor = (projectId: string): ProjectLog => {
    const existing = logs.get(projectId);
    if (existing) return existing;
    const stored = readFileEvents(projectId);
    const last = stored.at(-1);
    const log: ProjectLog = {
      lastSeq: last ? last.seq : 0,
      ring: stored.slice(-RING_SIZE),
      listeners: new Set(),
    };
    logs.set(projectId, log);
    return log;
  };

  return {
    emit(input: StudioEventInput): StudioEvent {
      const log = logFor(input.projectId);
      const event = { ...input, seq: log.lastSeq + 1, ts: Date.now() } as StudioEvent;
      const file = eventsFile(input.projectId);
      mkdirSync(path.dirname(file), { recursive: true });
      appendFileSync(file, `${JSON.stringify(event)}\n`);
      log.lastSeq = event.seq;
      log.ring.push(event);
      if (log.ring.length > RING_SIZE) log.ring.splice(0, log.ring.length - RING_SIZE);
      for (const listener of [...log.listeners]) {
        try {
          listener(event);
        } catch (error) {
          console.error('[events] listener failed', error);
        }
      }
      return event;
    },

    since(projectId: string, afterSeq: number): StudioEvent[] {
      const log = logFor(projectId);
      const first = log.ring[0];
      if (first === undefined || first.seq <= afterSeq + 1) {
        return log.ring.filter((event) => event.seq > afterSeq);
      }
      return readFileEvents(projectId).filter((event) => event.seq > afterSeq);
    },

    subscribe(projectId: string, listener: (event: StudioEvent) => void): () => void {
      const log = logFor(projectId);
      log.listeners.add(listener);
      return () => {
        log.listeners.delete(listener);
      };
    },
  };
}
