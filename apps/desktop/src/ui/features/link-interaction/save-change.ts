import { linksApi } from "./deps.js";
import type { LinkInteractionChange, PrototypeLink } from "./deps.js";

interface SaveHost {
  readonly link: PrototypeLink;
  readonly onError: (message: string) => void;
  readonly projectId: string;
}

const savedId = async (
  projectId: string,
  link: PrototypeLink
): Promise<string | null> => {
  if (!link.implicit) {
    return link.id;
  }

  const file = await linksApi.keep(projectId, [link.id]);

  const kept = file.links.find(
    (item) =>
      item.from.frame === link.from.frame &&
      item.from.selector === link.from.selector
  );

  return kept?.id ?? null;
};

const saveChange = async (
  host: SaveHost,
  change: LinkInteractionChange
): Promise<void> => {
  try {
    const linkId = await savedId(host.projectId, host.link);

    if (linkId !== null) {
      await linksApi.setInteraction(host.projectId, { ...change, linkId });
    }
  } catch (error) {
    if (error instanceof Error) {
      host.onError(error.message);

      return;
    }

    host.onError(String(error));
  }
};

export { saveChange };

export type { SaveHost };
