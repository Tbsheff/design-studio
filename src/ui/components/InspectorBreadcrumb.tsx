import { memo, Fragment, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { parseSelectionPath, pathCrumbs, type PathCrumb } from '../authoredCss';
import type { PreviewPort } from '../bridge';
import { Icon } from './Icon';

interface Props {
  selection: SelectionContext;
  port: MutableRefObject<PreviewPort | null>;
}

function elementLabel(selection: SelectionContext): string {
  const firstClass = /^<[^>]*\bclass="([^"\s]+)/.exec(selection.outerHTML.slice(0, 4000))?.[1];
  return firstClass ? `${selection.tag}.${firstClass}` : selection.tag;
}

const GAP_CRUMB_PX = 28;

function fitCount(el: HTMLOListElement, total: number): number {
  const items = Array.from(el.children) as HTMLElement[];
  const first = items[0];
  if (!first || el.scrollWidth <= el.clientWidth + 1) return total;
  const gap = GAP_CRUMB_PX + (items[1]?.offsetWidth ?? 0);
  for (let cut = 1; cut <= total; cut += 1) {
    const start = items[cut * 2]?.offsetLeft ?? el.scrollWidth;
    if (el.scrollWidth - (start - first.offsetLeft) + gap <= el.clientWidth + 1) return total - cut;
  }
  return 0;
}

function useFitCount(list: MutableRefObject<HTMLOListElement | null>, total: number): number {
  const [shown, setShown] = useState(total);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el || shown === 0 || el.scrollWidth <= el.clientWidth + 1) return;
    setShown(shown === total ? fitCount(el, total) : shown - 1);
  }, [list, shown, total]);
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      setShown(total);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [list, total]);
  return Math.min(shown, total);
}

function Separator() {
  return (
    <li aria-hidden="true" className="ins-crumb-sep">
      <Icon name="chevronRight" size={12} />
    </li>
  );
}

function HiddenCrumbs({ hidden, onSelect }: { hidden: PathCrumb[]; onSelect: (levels: number) => void }) {
  const nearest = hidden.at(-1);
  if (!nearest) return null;
  return (
    <>
      <li>
        <button type="button" className="ins-crumb gap" aria-label={`Select ${nearest.label}`} data-tip={hidden.map((entry) => entry.label).join(' › ')} data-tip-align="start" onClick={() => onSelect(nearest.levels)}>
          …
        </button>
      </li>
      <Separator />
    </>
  );
}

function InspectorBreadcrumbView({ selection, port }: Props) {
  const list = useRef<HTMLOListElement>(null);
  const path = pathCrumbs(parseSelectionPath(selection.path));
  const count = useFitCount(list, path.length);
  if (path.length === 0) return null;
  const select = (levels: number) => {
    for (let step = 0; step < levels; step += 1) port.current?.post({ type: 'select-relative', selector: selection.selector, move: 'parent' });
  };
  const cut = path.length - count;
  const current = elementLabel(selection);
  return (
    <nav className="ins-crumbs" aria-label="Element path">
      <ol ref={list}>
        <HiddenCrumbs hidden={path.slice(0, cut)} onSelect={select} />
        {path.slice(cut).map((crumb) => (
          <Fragment key={crumb.levels}>
            <li>
              <button type="button" className="ins-crumb" data-tip={`Select ${crumb.label}`} onClick={() => select(crumb.levels)}>
                {crumb.label}
              </button>
            </li>
            <Separator />
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

export const InspectorBreadcrumb = memo(
  InspectorBreadcrumbView,
  (a, b) => a.port === b.port && a.selection.selector === b.selection.selector && a.selection.tag === b.selection.tag && a.selection.outerHTML === b.selection.outerHTML && a.selection.path === b.selection.path,
);
