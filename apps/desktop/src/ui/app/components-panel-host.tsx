import { Suspense, useCallback } from "react";
import type { ComponentProps, ReactElement } from "react";

import {
  ChartPanel,
  ChartTabBar,
  useChartTab,
} from "../features/chart/index.js";
import { ComponentsPanel as FeatureComponentsPanel } from "../features/design-system/components-panel.js";
import { GalleryHost } from "../features/gallery/gallery-host.js";
import {
  PatternPanel,
  PatternTabs,
  useInsertTab,
} from "../features/pattern/index.js";

type PanelProps = Omit<
  ComponentProps<typeof FeatureComponentsPanel>,
  "renderGallery"
>;

type GallerySlot = Parameters<
  NonNullable<ComponentProps<typeof FeatureComponentsPanel>["renderGallery"]>
>[0];

const ComponentsPanel = ({
  projectId,
  directionId,
  list,
  active,
  onMention,
  kind,
  selection,
}: PanelProps): ReactElement => {
  const renderGallery = useCallback(
    ({ component, onClose }: GallerySlot) => (
      <GalleryHost
        component={component}
        directionId={directionId}
        projectId={projectId}
        selection={selection}
        onClose={onClose}
      />
    ),
    [directionId, projectId, selection]
  );

  const { select: handleSelect, tab } = useInsertTab();
  const chartTab = useChartTab();
  const handleChartToggle = chartTab.toggle;

  let panel = (
    <FeatureComponentsPanel
      projectId={projectId}
      directionId={directionId}
      list={list}
      active={active}
      onMention={onMention}
      kind={kind}
      selection={selection}
      renderGallery={renderGallery}
    />
  );

  if (tab === "patterns") {
    panel = (
      <Suspense fallback={null}>
        <PatternPanel
          directionId={directionId}
          kind={kind}
          projectId={projectId}
          selection={selection}
        />
      </Suspense>
    );
  }

  if (chartTab.isOpen) {
    panel = (
      <Suspense fallback={null}>
        <ChartPanel
          directionId={directionId}
          kind={kind}
          projectId={projectId}
          selection={selection}
        />
      </Suspense>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <PatternTabs onSelect={handleSelect} tab={tab} />
        <ChartTabBar isOpen={chartTab.isOpen} onToggle={handleChartToggle} />
      </Suspense>
      {panel}
    </>
  );
};

export { ComponentsPanel };
