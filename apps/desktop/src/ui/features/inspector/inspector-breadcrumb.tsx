import type { SelectionContext } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import {
  memo,
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { MutableRefObject } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { parseSelectionPath, pathCrumbs } from "./authored-css.js";
import type { PathCrumb } from "./authored-css.js";
import { copy } from "./copy.js";

interface Props {
  readonly selection: SelectionContext;
  readonly port: MutableRefObject<PreviewPort | null>;
}

const elementLabel = (selection: SelectionContext): string => {
  const firstClass = /^<[^>]*\bclass="([^"\s]+)/u.exec(
    selection.outerHTML.slice(0, 4000)
  )?.[1];

  return firstClass ? `${selection.tag}.${firstClass}` : selection.tag;
};

const GAP_CRUMB_PX = 28;

const fitCount = (el: HTMLOListElement, total: number): number => {
  const items = [...el.children] as HTMLElement[];
  const first = items[0];

  if (!first || el.scrollWidth <= el.clientWidth + 1) {
    return total;
  }

  const gap = GAP_CRUMB_PX + (items[1]?.offsetWidth ?? 0);

  for (let cut = 1; cut <= total; cut += 1) {
    const start = items[cut * 2]?.offsetLeft ?? el.scrollWidth;

    if (
      el.scrollWidth - (start - first.offsetLeft) + gap <=
      el.clientWidth + 1
    ) {
      return total - cut;
    }
  }

  return 0;
};

const useFitCount = (
  list: MutableRefObject<HTMLOListElement | null>,
  total: number
): number => {
  const [shown, setShown] = useState(total);
  useLayoutEffect(() => {
    const el = list.current;

    if (!el || shown === 0 || el.scrollWidth <= el.clientWidth + 1) {
      return;
    }

    setShown(shown === total ? fitCount(el, total) : shown - 1);
  }, [list, shown, total]);
  useEffect(() => {
    const el = list.current;

    if (!el) {
      return;
    }

    let width = el.clientWidth;

    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) {
        return;
      }

      width = el.clientWidth;
      setShown(total);
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, [list, total]);

  return Math.min(shown, total);
};

const Separator = () => (
  <li aria-hidden="true" className="ins-crumb-sep">
    <Icon name="chevronRight" size={12} />
  </li>
);

const HiddenCrumbs = ({
  hidden,
  onSelect,
}: {
  readonly hidden: PathCrumb[];
  readonly onSelect: (levels: number) => void;
}) => {
  const nearest = hidden.at(-1);

  if (!nearest) {
    return null;
  }

  return (
    <>
      <li>
        <button
          type="button"
          className="ins-crumb gap"
          aria-label={`Select ${nearest.label}`}
          data-tip={hidden.map((entry) => entry.label).join(" › ")}
          data-tip-align="start"
          onClick={() => onSelect(nearest.levels)}
        >
          …
        </button>
      </li>
      <Separator />
    </>
  );
};

const InspectorBreadcrumbView = ({ selection, port }: Props) => {
  const list = useRef<HTMLOListElement>(null);
  const path = pathCrumbs(parseSelectionPath(selection.path));
  const count = useFitCount(list, path.length);

  if (path.length === 0) {
    return null;
  }

  const select = (levels: number) => {
    for (let step = 0; step < levels; step += 1) {
      port.current?.post({
        move: "parent",
        selector: selection.selector,
        type: "select-relative",
      });
    }

    list.current
      ?.closest(".studio")
      ?.querySelector<HTMLElement>(".stage")
      ?.focus({ preventScroll: true });
  };

  const cut = path.length - count;
  const current = elementLabel(selection);

  return (
    <nav className="ins-crumbs" aria-label={copy.elementPath}>
      <ol ref={list}>
        <HiddenCrumbs hidden={path.slice(0, cut)} onSelect={select} />
        {path.slice(cut).map((crumb) => (
          <Fragment key={crumb.levels}>
            <li>
              <button
                type="button"
                className="ins-crumb"
                data-tip={`Select ${crumb.label}`}
                onClick={() => select(crumb.levels)}
              >
                {crumb.label}
              </button>
            </li>
            <Separator />
          </Fragment>
        ))}
        <li>
          <span
            className="ins-crumb current"
            aria-current="true"
            data-tip={current}
          >
            {current}
          </span>
        </li>
      </ol>
    </nav>
  );
};

const InspectorBreadcrumb = memo(
  InspectorBreadcrumbView,
  (a, b) =>
    a.port === b.port &&
    a.selection.selector === b.selection.selector &&
    a.selection.tag === b.selection.tag &&
    a.selection.outerHTML === b.selection.outerHTML &&
    a.selection.path === b.selection.path
);

export { InspectorBreadcrumb };
