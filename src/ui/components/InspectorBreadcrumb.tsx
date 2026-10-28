import { Fragment, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { collapseCrumbs, parseSelectionPath, pathCrumbs, type Crumb } from '../authoredCss';
import type { PreviewPort } from '../bridge';
import { Icon } from './Icon';

interface Props {
  selection: SelectionContext;
  port: MutableRefObject<PreviewPort | null>;
}

function elementLabel(selection: SelectionContext): string {
  const firstClass = /\bclass="([^"\s]+)/.exec(selection.outerHTML.slice(0, 500))?.[1];
  return firstClass ? `${selection.tag}.${firstClass}` : selection.tag;
}

export function InspectorBreadcrumb({ selection, port }: Props) {
  const [expanded, setExpanded] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    el.toggleAttribute('data-clipped', el.scrollLeft > 0);
  }, [expanded, selection.selector]);
  const path = pathCrumbs(parseSelectionPath(selection.path));
  if (path.length === 0) return null;
  const crumbs: Crumb[] = expanded ? path.map((crumb) => ({ kind: 'node', ...crumb })) : collapseCrumbs(path);
  const select = (levels: number) => {
    for (let step = 0; step < levels; step += 1) port.current?.post({ type: 'select-relative', selector: selection.selector, move: 'parent' });
  };
  const current = elementLabel(selection);
  return (
    <nav className="ins-crumbs" aria-label="Element path">
      <ol ref={list} onScroll={(event) => event.currentTarget.toggleAttribute('data-clipped', event.currentTarget.scrollLeft > 0)}>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.kind === 'node' ? crumb.levels : `gap-${index}`}>
            <li>
              {crumb.kind === 'node' ? (
                <button type="button" className="ins-crumb" data-tip={`Select ${crumb.label}`} onClick={() => select(crumb.levels)}>
                  {crumb.label}
                </button>
              ) : (
                <button
                  type="button"
                  className="ins-crumb gap"
                  aria-label={`Show ${crumb.hidden.length} more`}
                  data-tip={crumb.hidden.map((entry) => entry.label).join(' › ')}
                  onClick={() => setExpanded(true)}
                >
                  …
                </button>
              )}
            </li>
            <li aria-hidden="true" className="ins-crumb-sep">
              <Icon name="chevronRight" size={12} />
            </li>
          </Fragment>
        ))}
        <li>
          <span className="ins-crumb current" aria-current="true" data-tip={current}>
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
}
