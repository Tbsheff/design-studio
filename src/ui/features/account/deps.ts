import { routes } from "../../../shared/actions/cloud/routes.js";

const getCloudRoute = routes.getCloud;

export { getCloudRoute };

export type { WireOutput } from "../../../shared/actions/_core/action.js";

export type { getCloud } from "../../../shared/actions/cloud/get.js";

export { desktopBridge } from "../../platform/desktop";

export { useAction } from "../../platform/query";
