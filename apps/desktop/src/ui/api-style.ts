import { routes as fillRoutes } from "@design-studio/actions/fill/routes";
import { routes as motionRoutes } from "@design-studio/actions/motion/routes";
import { routes as spacingRoutes } from "@design-studio/actions/spacing/routes";
import type {
  SourceLoc,
  CreateTokenRequest,
  CreateTokenResult,
  DesignSystemState,
  TokenChange,
  TokenPreviewResult,
  UpdateTokensResult,
} from "@design-studio/contracts";

import type {
  FillSetBody,
  MotionSetBody,
  SpacingComputed,
  SpacingSetBody,
  TextStyleApplyBody,
  TextStyleCreateBody,
  TextStyleDetachBody,
} from "./api-body-types.js";
import { json, toDirectionPath } from "./api-core.js";
import { timedEdit } from "./api-telemetry.js";
import { toStyleQuery } from "./api-wire.js";
import { call, pickMessage, request } from "./platform/http";
import type { RouteOutput } from "./platform/http";
import {
  applyTextStyleAt,
  createTextStyleAt,
  detachTextStyleAt,
  listTextStylesAt,
} from "./platform/text-style-api";

const EDIT_COUNT = 1;

const TEXT_STYLE_KIND = "text-style";

const styleApi = {
  applyTextStyle: (
    pid: string,
    did: string,
    body: TextStyleApplyBody
  ): ReturnType<typeof applyTextStyleAt> =>
    timedEdit(
      { directionId: did, projectId: pid },
      TEXT_STYLE_KIND,
      EDIT_COUNT,
      () => applyTextStyleAt(pid, did, body)
    ),
  createTextStyle: (
    pid: string,
    did: string,
    body: TextStyleCreateBody
  ): ReturnType<typeof createTextStyleAt> =>
    timedEdit(
      { directionId: did, projectId: pid },
      TEXT_STYLE_KIND,
      EDIT_COUNT,
      () => createTextStyleAt(pid, did, body)
    ),
  createToken: async (
    pid: string,
    did: string,
    req: CreateTokenRequest
  ): Promise<CreateTokenResult> => {
    const res = await request(
      "POST",
      `${toDirectionPath(pid, did)}/design-system/tokens`,
      req,
      pickMessage
    );

    return (await res.json()) as CreateTokenResult;
  },
  detachTextStyle: (
    pid: string,
    did: string,
    body: TextStyleDetachBody
  ): ReturnType<typeof detachTextStyleAt> =>
    timedEdit(
      { directionId: did, projectId: pid },
      TEXT_STYLE_KIND,
      EDIT_COUNT,
      () => detachTextStyleAt(pid, did, body)
    ),
  getDesignSystem: (pid: string, did: string): Promise<DesignSystemState> =>
    json<DesignSystemState>(
      "GET",
      `${toDirectionPath(pid, did)}/design-system`
    ),
  getFill: (
    pid: string,
    did: string,
    source: SourceLoc
  ): Promise<RouteOutput<typeof fillRoutes.getFill>> =>
    call(fillRoutes.getFill, toStyleQuery(pid, did, source)),
  getSpacing: (
    pid: string,
    did: string,
    source: SourceLoc,
    computed: SpacingComputed
  ): Promise<RouteOutput<typeof spacingRoutes.getSpacing>> =>
    call(spacingRoutes.getSpacing, {
      ...toStyleQuery(pid, did, source),
      ...computed,
    }),
  listMotion: (
    pid: string,
    did: string,
    source: SourceLoc
  ): Promise<RouteOutput<typeof motionRoutes.inspectMotion>> =>
    call(motionRoutes.inspectMotion, toStyleQuery(pid, did, source)),
  listTextStyles: (
    pid: string,
    did: string
  ): ReturnType<typeof listTextStylesAt> => listTextStylesAt(pid, did),
  previewTokens: async (
    pid: string,
    did: string,
    changes: TokenChange[]
  ): Promise<TokenPreviewResult> => {
    const { routes: directEditRoutes } =
      await import("@design-studio/actions/direct-edit/routes");

    return call(directEditRoutes.inspectTokensDirectEdit, {
      changes: JSON.stringify(changes),
      directionId: did,
      projectId: pid,
    });
  },
  setFill: (
    pid: string,
    did: string,
    body: FillSetBody
  ): Promise<RouteOutput<typeof fillRoutes.setFill>> =>
    timedEdit({ directionId: did, projectId: pid }, "fill", EDIT_COUNT, () =>
      call(fillRoutes.setFill, { ...body, directionId: did, projectId: pid })
    ),
  setMotion: (
    pid: string,
    did: string,
    body: MotionSetBody
  ): Promise<RouteOutput<typeof motionRoutes.setMotion>> =>
    timedEdit({ directionId: did, projectId: pid }, "motion", EDIT_COUNT, () =>
      call(motionRoutes.setMotion, {
        ...body,
        directionId: did,
        projectId: pid,
      })
    ),
  setSpacing: (
    pid: string,
    did: string,
    body: SpacingSetBody
  ): Promise<RouteOutput<typeof spacingRoutes.setSpacing>> =>
    timedEdit({ directionId: did, projectId: pid }, "spacing", EDIT_COUNT, () =>
      call(spacingRoutes.setSpacing, {
        ...body,
        directionId: did,
        projectId: pid,
      })
    ),
  updateTokens: async (
    pid: string,
    did: string,
    changes: TokenChange[]
  ): Promise<UpdateTokensResult> => {
    const res = await request(
      "POST",
      `${toDirectionPath(pid, did)}/design-system/tokens/update`,
      { changes },
      pickMessage
    );

    return (await res.json()) as UpdateTokensResult;
  },
};

export { styleApi };
