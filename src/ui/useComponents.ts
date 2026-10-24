import { useEffect, useRef, useState } from 'react';
import { STUDIO_TOKEN_HEADER, type ComponentInfo } from '../shared/contracts';
import { json } from './api';
import { getSession } from './session';
import type { FilesChange } from './useStudioData';

const REFRESH_MS = 400;

function base(projectId: string, directionId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/d/${encodeURIComponent(directionId)}/components`;
}

export async function componentThumb(projectId: string, directionId: string, id: string, version: string): Promise<string | null> {
  const res = await fetch(`${base(projectId, directionId)}/${encodeURIComponent(id)}/thumb?v=${encodeURIComponent(version)}`, { headers: { [STUDIO_TOKEN_HEADER]: getSession().token } });
  if (!res.ok) return null;
  return URL.createObjectURL(await res.blob());
}

export interface ComponentList {
  components: ComponentInfo[] | null;
  version: string;
  error: string | null;
}

export function useComponents(projectId: string, directionId: string | null, lastChange: FilesChange | null): ComponentList {
  const [state, setState] = useState<ComponentList>({ components: null, version: '0', error: null });
  const changedAt = lastChange && lastChange.directionId === directionId ? lastChange.changedAt : 0;
  const seq = useRef(0);
  useEffect(() => {
    if (!directionId) return;
    const my = ++seq.current;
    const version = String(changedAt);
    const timer = window.setTimeout(
      () => {
        json<{ components: ComponentInfo[] }>('GET', base(projectId, directionId)).then(
          (result) => {
            if (my === seq.current) setState({ components: result.components, version, error: null });
          },
          (error: unknown) => {
            if (my === seq.current) setState((prev) => ({ ...prev, error: error instanceof Error ? error.message : String(error) }));
          },
        );
      },
      changedAt === 0 ? 0 : REFRESH_MS,
    );
    return () => window.clearTimeout(timer);
  }, [projectId, directionId, changedAt]);
  useEffect(() => setState({ components: null, version: '0', error: null }), [projectId, directionId]);
  return state;
}
