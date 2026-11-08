import type { ZoomSetting } from "../../platform/storage.js";

const ZOOM_100 = 100;

const zoomOptionLabel = (setting: ZoomSetting, zoom: number): string => {
  if (setting === "fit") {
    return `Fit ${Math.round(zoom * ZOOM_100)}%`;
  }

  return "Fit";
};

export { zoomOptionLabel };
