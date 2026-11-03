import { useCallback } from "react";
import type { ComponentProps, ReactElement } from "react";

import { ComponentsPanel as FeatureComponentsPanel } from "../features/design-system/components-panel";
import { GalleryHost } from "../features/gallery/gallery-host";

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

  return (
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
};

export { ComponentsPanel };
