import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";

import type { ProjectHit, ProjectType } from "./deps.js";
import { toClassName } from "./thumb-class-model.js";
import { useThumb } from "./use-thumb.js";

const TYPE_ICON: Record<ProjectType, IconName> = {
  "design-system": "palette",
  html: "file",
  next: "code",
  react: "react",
  vite: "code",
};

const THUMB_ICON_SIZE = 12;
const THUMB_WIDTH = 28;
const THUMB_HEIGHT = 18;

const toThumbBody = (url: string | null, type: ProjectType): ReactElement => {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={THUMB_WIDTH}
        height={THUMB_HEIGHT}
        draggable={false}
      />
    );
  }

  return <Icon name={TYPE_ICON[type]} size={THUMB_ICON_SIZE} />;
};

const ProjectThumb = ({
  hit,
  className,
}: {
  readonly hit: ProjectHit;
  readonly className?: string;
}): ReactElement => {
  const url = useThumb(hit);

  return (
    <span
      className={toClassName("pnav-thumb", className ?? null)}
      data-type={hit.type}
      aria-hidden="true"
    >
      {toThumbBody(url, hit.type)}
    </span>
  );
};

export { HealthDot } from "./health-dot.js";

export { ProjectThumb };
