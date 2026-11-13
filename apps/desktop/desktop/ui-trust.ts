import { randomBytes } from "node:crypto";

import type { OnBeforeSendHeadersListenerDetails, Session } from "electron";

const UI_SECRET_HEADER = "x-studio-ui-secret";

const SECRET_BYTES = 32;

const UI_SECRET = randomBytes(SECRET_BYTES).toString("hex");

const toOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const isStudioFrameRequest = (
  details: OnBeforeSendHeadersListenerDetails,
  studioOrigin: string
): boolean => {
  if (toOrigin(details.url) !== studioOrigin) {
    return false;
  }

  const initiator = details.initiatorOrigin ?? null;

  if (initiator !== null && initiator !== studioOrigin) {
    return false;
  }

  if (details.resourceType === "mainFrame") {
    return true;
  }

  return (details.frame ?? null) !== null && details.frame?.parent === null;
};

const toRequestHeaders = (
  details: OnBeforeSendHeadersListenerDetails,
  studioOrigin: string
): OnBeforeSendHeadersListenerDetails["requestHeaders"] => {
  if (!isStudioFrameRequest(details, studioOrigin)) {
    return details.requestHeaders;
  }

  return { ...details.requestHeaders, [UI_SECRET_HEADER]: UI_SECRET };
};

const trustStudioOrigin = (target: Session, studioUrl: string): void => {
  const studioOrigin = new URL(studioUrl).origin;

  target.webRequest.onBeforeSendHeaders(
    { urls: [`${studioOrigin}/*`] },
    (details, respond) => {
      respond({ requestHeaders: toRequestHeaders(details, studioOrigin) });
    }
  );
};

export { UI_SECRET, trustStudioOrigin };
