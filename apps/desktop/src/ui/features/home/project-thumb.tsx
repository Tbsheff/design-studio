import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import type {
  ProjectHit,
  ProjectType,
} from "../../../shared/project-search.js";
import { api } from "../../api.js";

import "../../styles/project-nav.css";

const cache = new Map<string, Promise<string>>();

const TYPE_ICON: Record<ProjectType, IconName> = {
  "design-system": "palette",
  html: "file",
  next: "code",
  react: "react",
  vite: "code",
};

function useThumb(hit: ProjectHit): string | null {
  const key = hit.thumbnail ? `${hit.id}/${hit.thumbnail}` : null;

  const [url, setUrl] = useState<{
    readonly key: string;
    readonly url: string;
  } | null>(null);

  useEffect(() => {
    if (!key || !hit.thumbnail) {
      return;
    }

    let live = true;
    let pending = cache.get(key);

    if (!pending) {
      pending = api
        .thumbnail(hit.id, hit.thumbnail)
        .then((blob) => URL.createObjectURL(blob));
      pending.catch(() => cache.delete(key));
      cache.set(key, pending);
    }

    pending.then(
      (next) => live && setUrl({ key, url: next }),
      () => null
    );

    return (): void => {
      live = false;
    };
  }, [key, hit.id, hit.thumbnail]);

  return url && url.key === key ? url.url : null;
}

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
      className={`pnav-thumb${className ? ` ${className}` : ""}`}
      data-type={hit.type}
      aria-hidden="true"
    >
      {url ? (
        <img src={url} alt="" draggable={false} />
      ) : (
        <Icon name={TYPE_ICON[hit.type]} size={12} />
      )}
    </span>
  );
};

const TypeBadge = ({ hit }: { readonly hit: ProjectHit }): ReactElement => (
  <span className="badge pnav-badge" data-type={hit.type}>
    {hit.typeLabel}
  </span>
);

const HealthDot = ({
  hit,
  className,
}: {
  readonly hit: ProjectHit;
  readonly className?: string;
}): ReactElement | null => {
  if (!hit.health) {
    return null;
  }

  return (
    <span
      className={`pnav-dot${className ? ` ${className}` : ""}`}
      data-level={hit.health.level}
      role="img"
      aria-label={hit.health.note}
      data-tip={hit.health.note}
    />
  );
};

export { HealthDot, ProjectThumb, TypeBadge };
