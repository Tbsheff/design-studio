import { useEffect, useState } from 'react';
import type { ElementSourceInfo, SourceLoc, TailwindOutcome } from '../../shared/contracts';

export interface ElementInfo {
  tailwind: TailwindOutcome | null;
  element: ElementSourceInfo | null;
}
import { api } from '../api';

export function useElementClasses(projectId: string, directionId: string | null, source: SourceLoc | null, savedAt: number): ElementInfo | null {
  const [info, setInfo] = useState<ElementInfo | null>(null);
  const file = source?.file;
  const line = source?.line;
  const col = source?.col;
  useEffect(() => {
    if (!directionId || file === undefined || line === undefined || col === undefined) {
      setInfo(null);
      return;
    }
    let live = true;
    api
      .elementClasses(projectId, directionId, { file, line, col })
      .then((result) => {
        if (live) setInfo({ tailwind: result.tailwind, element: result.element ?? null });
      })
      .catch(() => {
        if (live) setInfo(null);
      });
    return () => {
      live = false;
    };
  }, [projectId, directionId, file, line, col, savedAt]);
  return info;
}

export function ClassLine({ info }: { info: TailwindOutcome | null }) {
  if (!info || info.mode === 'none') return null;
  const text = info.classes.length > 0 ? info.classes.join(' ') : 'No classes yet';
  return (
    <div className="ins-classes" aria-label="Tailwind classes">
      <span className="ins-classes-label">Classes</span>
      <code className="ins-classes-list" title={text}>
        {text}
        {info.dynamic && <span className="ins-classes-more"> + dynamic</span>}
      </code>
      {info.note && <p className="ins-note ins-classes-note">{info.note}</p>}
    </div>
  );
}
