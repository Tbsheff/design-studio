import { routes as textStyleRoutes } from "@design-studio/actions/text-style/routes";

import { call } from "./http";
import type { RouteInput, RouteOutput } from "./http";

type ApplyInput = RouteInput<typeof textStyleRoutes.applyTextStyle>;

type DetachInput = RouteInput<typeof textStyleRoutes.updateTextStyle>;

const LIST_LIMIT = 100;

const listTextStylesAt = (
  pid: string,
  did: string
): Promise<RouteOutput<typeof textStyleRoutes.inspectTextStyle>> =>
  call(textStyleRoutes.inspectTextStyle, {
    directionId: did,
    limit: LIST_LIMIT,
    projectId: pid,
    query: "",
  });

const applyTextStyleAt = (
  pid: string,
  did: string,
  body: { readonly style: string; readonly target: ApplyInput["target"] }
): Promise<RouteOutput<typeof textStyleRoutes.applyTextStyle>> =>
  call(textStyleRoutes.applyTextStyle, {
    directionId: did,
    projectId: pid,
    style: body.style,
    target: body.target,
  });

const createTextStyleAt = (
  pid: string,
  did: string,
  body: {
    readonly name: string;
    readonly styles: Readonly<Record<string, string>>;
  }
): Promise<RouteOutput<typeof textStyleRoutes.createTextStyle>> =>
  call(textStyleRoutes.createTextStyle, {
    directionId: did,
    name: body.name,
    projectId: pid,
    styles: body.styles,
  });

const detachTextStyleAt = (
  pid: string,
  did: string,
  body: {
    readonly styles: Readonly<Record<string, string>>;
    readonly target: DetachInput["target"];
  }
): Promise<RouteOutput<typeof textStyleRoutes.updateTextStyle>> =>
  call(textStyleRoutes.updateTextStyle, {
    directionId: did,
    projectId: pid,
    styles: body.styles,
    target: body.target,
  });

export {
  applyTextStyleAt,
  createTextStyleAt,
  detachTextStyleAt,
  listTextStylesAt,
};
