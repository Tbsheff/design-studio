import { routes as pageRoutes } from "@design-studio/actions/page/routes";
import type { PageImportResult } from "@design-studio/contracts/page-import";

import { call } from "./http";

interface PageImportBody {
  readonly selector: string | null;
  readonly url: string;
  readonly width: number;
}

const importPageAt = (
  pid: string,
  did: string,
  body: PageImportBody
): Promise<PageImportResult> =>
  call(pageRoutes.importPage, {
    directionId: did,
    name: null,
    projectId: pid,
    selector: body.selector,
    url: body.url,
    width: body.width,
  });

export { importPageAt };

export type { PageImportBody };
