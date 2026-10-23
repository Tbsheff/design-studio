import { useEffect, useRef, useState } from 'react';
import type { StudioEvent, StudioEventBody } from '../shared/contracts';
import { eventsUrl } from './api';

const EVENT_TYPES: StudioEventBody['type'][] = [
  'run.started',
  'run.text.delta',
  'run.text',
  'run.thinking',
  'run.tool.started',
  'run.tool.finished',
  'run.finished',
  'files.changed',
  'version.created',
  'direction.updated',
  'status.changed',
  'preview.build-error',
  'comments.changed',
];

export type ConnectionState = 'connecting' | 'open' | 'reconnecting';

export function useProjectEvents(projectId: string | null, onEvent: (event: StudioEvent) => void): ConnectionState {
  const handler = useRef(onEvent);
  handler.current = onEvent;
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  useEffect(() => {
    if (!projectId) return;
    let lastSeq = 0;
    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let retryDelay = 500;
    let disposed = false;

    const receive = (msg: MessageEvent<string>) => {
      let event: StudioEvent;
      try {
        event = JSON.parse(msg.data) as StudioEvent;
      } catch {
        return;
      }
      if (typeof event.seq !== 'number' || event.seq <= lastSeq) return;
      lastSeq = event.seq;
      handler.current(event);
    };

    const connect = () => {
      if (disposed) return;
      const es = new EventSource(eventsUrl(projectId, lastSeq));
      source = es;
      es.onopen = () => {
        retryDelay = 500;
        setConnection('open');
      };
      es.onmessage = receive;
      for (const type of EVENT_TYPES) es.addEventListener(type, receive as EventListener);
      es.onerror = () => {
        es.close();
        if (disposed) return;
        setConnection('reconnecting');
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 8000);
      };
    };

    setConnection('connecting');
    connect();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      source?.close();
    };
  }, [projectId]);

  return connection;
}
