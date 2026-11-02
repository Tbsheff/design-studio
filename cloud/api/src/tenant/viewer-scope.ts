import { Context } from "effect";

interface ShareScope {
  readonly canComment: boolean;
  readonly directionId: string | null;
  readonly kind: "share";
  readonly orgId: string;
  readonly projectId: string;
  readonly shareId: string;
  readonly versionId: string | null;
}

interface PublicScope {
  readonly kind: "public";
  readonly liveVersionId: string | null;
  readonly orgId: string;
  readonly projectId: string;
  readonly publicationId: string;
}

type ViewerScopeApi = PublicScope | ShareScope;

class ViewerScope extends Context.Service<ViewerScope, ViewerScopeApi>()(
  "design-studio/tenant/ViewerScope"
) {
  declare public readonly access: "read";
}

export { ViewerScope };

export type { PublicScope, ShareScope, ViewerScopeApi };
