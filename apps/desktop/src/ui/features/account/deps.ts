import { routes } from "@design-studio/actions/cloud/routes";

const getCloudRoute = routes.getCloud;

export { getCloudRoute };

export type { WireOutput } from "@design-studio/actions/_core/action";

export type { getCloud } from "@design-studio/actions/cloud/get";

export { openAppSettings } from "../../domain/app-settings-events.js";

export { desktopBridge } from "../../platform/desktop.js";

export { useAction } from "../../platform/query.js";
