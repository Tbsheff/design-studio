import { routes } from "../../../shared/actions/publish/routes.js";
import type { CallOutput } from "../../platform/http.js";
import { useAction, useOp } from "../../platform/query.js";
import type { Action, QueryState } from "../../platform/query.js";

type PublicationList = CallOutput<typeof routes.list>;

const usePublications = (projectId: string): QueryState<PublicationList> =>
  useOp(routes.list, { projectId });

const useUnpublish = (): Action<typeof routes.unpublish> =>
  useAction(routes.unpublish);

export { usePublications, useUnpublish };
