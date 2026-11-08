import type {
  LinkMotion,
  LinkTarget,
  PrototypeLink,
} from "@design-studio/contracts/links";

import { linksApi } from "./links-api.js";

interface LinkChange extends LinkMotion {
  readonly to?: LinkTarget;
}

const changeLink = async (
  projectId: string,
  link: PrototypeLink,
  next: LinkChange
): Promise<void> => {
  if (!link.implicit) {
    await linksApi.update(projectId, link.id, next);

    return;
  }

  const { to, ...motion } = next;

  const file = await linksApi.keep(projectId, [link.id], motion);

  const kept = file.links.find(
    (item) =>
      item.from.frame === link.from.frame &&
      item.from.selector === link.from.selector
  );

  if (to && kept) {
    await linksApi.update(projectId, kept.id, { to });
  }
};

export { changeLink };

export type { LinkChange };
