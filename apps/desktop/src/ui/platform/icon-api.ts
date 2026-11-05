import { routes as iconRoutes } from "@design-studio/actions/icon/routes";
import type { SourceLoc } from "@design-studio/contracts";
import { ICON_LIST_DEFAULT } from "@design-studio/contracts/icons";
import type {
  IconList,
  IconPosition,
  IconSource,
} from "@design-studio/contracts/icons";
import type { InsertTarget } from "@design-studio/contracts/insert";

import { call } from "./http";

interface IconListQuery {
  query: string;
  library?: IconSource;
  limit?: number;
}

interface IconInsertBody {
  name: string;
  size: number;
  color?: string;
  library?: IconSource;
  position: IconPosition;
  target: InsertTarget;
}

interface IconInsertReply {
  file: string;
  icon: string;
  importAdded: boolean;
  select: readonly (SourceLoc & { tag: string })[];
  swapped: boolean;
  title: string;
  versionId: string;
}

const insertIconAt = (
  pid: string,
  did: string,
  body: IconInsertBody
): Promise<IconInsertReply> =>
  call(iconRoutes.insertIcon, {
    color: body.color ?? null,
    directionId: did,
    library: body.library ?? null,
    name: body.name,
    position: body.position,
    projectId: pid,
    size: body.size,
    target: body.target,
  });

const listIconsAt = (
  pid: string,
  did: string,
  query: IconListQuery
): Promise<IconList> =>
  call(iconRoutes.inspectIcon, {
    directionId: did,
    library: query.library ?? null,
    limit: query.limit ?? ICON_LIST_DEFAULT,
    projectId: pid,
    query: query.query,
  });

export { insertIconAt, listIconsAt };

export type { IconInsertBody, IconInsertReply, IconListQuery };
