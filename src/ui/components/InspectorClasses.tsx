import { useEffect, useState } from 'react';
import type { SourceLoc, TailwindOutcome } from '../../shared/contracts';
import type { VariantSupport } from '../../shared/variants';
import { api } from '../api';

export interface ElementClasses {
  tailwind: TailwindOutcome | null;
  variants: VariantSupport | null;
}

const NO_CLASSES: ElementClasses = { tailwind: null, variants: null };

export function useElementClasses(projectId: string, directionId: string | null, source: SourceLoc | null, savedAt: number, variant = ''): ElementClasses {
  const [info, setInfo] = useState<ElementClasses>(NO_CLASSES);
  const file = source?.file;
  const line = source?.line;
  const col = source?.col;
  useEffect(() => {
    if (!directionId || file === undefined || line === undefined || col === undefined) {
      setInfo(NO_CLASSES);
      return;
    }
    let live = true;
    api
      .elementClasses(projectId, directionId, { file, line, col }, variant)
      .then((result) => {
        if (live) setInfo({ tailwind: result.tailwind, variants: result.variants ?? null });
      })
      .catch(() => {
        if (live) setInfo(NO_CLASSES);
      });
    return () => {
      live = false;
    };
  }, [projectId, directionId, file, line, col, savedAt, variant]);
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
