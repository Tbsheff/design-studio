import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const GLYPH_SIZE = 18;

interface CardPreviewProps {
  readonly project: Project;
  readonly thumb: string | null;
}

const CardPreview = ({ project, thumb }: CardPreviewProps): ReactElement => {
  if (thumb) {
    return (
      <span className="project-thumb has-image" aria-hidden="true">
        <img
          src={thumb}
          alt=""
          draggable={false}
          data-version={project.thumbnail?.versionId}
        />
      </span>
    );
  }

  if (project.kind === "html") {
    return (
      <span className="project-thumb" aria-hidden="true">
        <span className={`project-glyph ${project.kind}`}>
          <Icon name="code" size={GLYPH_SIZE} />
        </span>
      </span>
    );
  }

  return (
    <span className="project-thumb" aria-hidden="true">
      <span className={`project-glyph ${project.kind}`}>
        <Icon name="react" size={GLYPH_SIZE} />
      </span>
    </span>
  );
};

export { CardPreview };
