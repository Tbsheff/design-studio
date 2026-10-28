import { useEffect, useState } from 'react';
import type { ElementSourceInfo, SourceLoc, TailwindOutcome } from '../../shared/contracts';
import type { VariantSupport } from '../../shared/variants';
import { api } from '../api';
import { InspectorSection } from './InspectorFields';

export interface ElementClasses {
  tailwind: TailwindOutcome | null;
  element: ElementSourceInfo | null;
  variants: VariantSupport | null;
}

const NO_CLASSES: ElementClasses = { tailwind: null, element: null, variants: null };

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
        if (live) setInfo({ tailwind: result.tailwind, element: result.element ?? null, variants: result.variants ?? null });
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

export function domClasses(outerHTML: string): string[] {
  const raw = /^<[^>]*\bclass="([^"]*)"/.exec(outerHTML.slice(0, 4000))?.[1] ?? '';
  return raw.split(/\s+/).filter(Boolean);
}

export function ClassLine({ info, resolved }: { info: TailwindOutcome | null; resolved: string[] }) {
  if (!info || info.mode === 'none') return null;
  const own = info.classes.length > 0;
  const list = own ? info.classes : resolved;
  const text = list.length > 0 ? list.join(' ') : 'No classes yet';
  return (
    <InspectorSection title="Classes" className="ins-classes" aside={!own && list.length > 0 ? <span className="ins-classes-tag">Read only</span> : undefined}>
      <code className={`ins-classes-list${own ? '' : ' resolved'}`} aria-label={own ? 'Tailwind classes' : 'Classes from the component, read only'}>
        {text}
        {info.dynamic && <span className="ins-classes-more"> + dynamic</span>}
      </code>
      {info.note && <p className="ins-note ins-classes-note">{info.note}</p>}
    </InspectorSection>
  );
}
