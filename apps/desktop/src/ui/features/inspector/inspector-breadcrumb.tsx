import type { SelectionContext } from "@design-studio/contracts";
import { memo, useCallback, useRef } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { findElement } from "../../platform/find-element.js";
import { parseSelectionPath, pathCrumbs } from "./authored-css.js";
import { toElementLabel } from "./breadcrumb-model.js";
import { copy } from "./copy.js";
import { CrumbButton } from "./crumb-button.js";
import { CrumbCurrent } from "./crumb-current.js";
import { HiddenCrumbs } from "./hidden-crumbs.js";
import { useFitCount } from "./use-fit-count.js";

interface Props {
  readonly selection: SelectionContext;
  readonly port: MutableRefObject<PreviewPort | null>;
}

const InspectorBreadcrumbView = ({
  selection,
  port,
}: Props): ReactElement | null => {
  const list = useRef<HTMLOListElement>(null);
  const path = pathCrumbs(parseSelectionPath(selection.path));
  const count = useFitCount(list, path.length);

  const handleSelect = useCallback(
    (levels: number): void => {
      for (let step = 0; step < levels; step += 1) {
        port.current?.post({
          move: "parent",
          selector: selection.selector,
          type: "select-relative",
        });
      }

      const studio = list.current?.closest(".studio");

      if (studio) {
        findElement(studio, ".stage")?.focus({ preventScroll: true });
      }
    },
    [port, selection.selector]
  );

  if (path.length === 0) {
    return null;
  }

  const cut = path.length - count;
  const current = toElementLabel(selection);

  return (
    <nav className="ins-crumbs" aria-label={copy.elementPath}>
      <ol ref={list}>
        <HiddenCrumbs hidden={path.slice(0, cut)} onSelect={handleSelect} />
        {path.slice(cut).map((crumb) => (
          <CrumbButton
            key={crumb.levels}
            crumb={crumb}
            onSelect={handleSelect}
          />
        ))}
        <CrumbCurrent label={current} />
      </ol>
    </nav>
  );
};

const isSameSelection = (first: Props, second: Props): boolean =>
  first.selection.selector === second.selection.selector &&
  first.selection.tag === second.selection.tag &&
  first.selection.outerHTML === second.selection.outerHTML &&
  first.selection.path === second.selection.path;

const InspectorBreadcrumb = memo(
  InspectorBreadcrumbView,
  (first, second) =>
    first.port === second.port && isSameSelection(first, second)
);

export { InspectorBreadcrumb };
