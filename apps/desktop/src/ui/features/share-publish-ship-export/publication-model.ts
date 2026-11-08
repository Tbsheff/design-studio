import { publishExpiryText } from "../../../shared/publish.js";
import type { Publication } from "../../../shared/publish.js";
import { pick } from "./pick.js";

const SHORT_VERSION = 7;

const VERSION_FORMAT = new Intl.DateTimeFormat([], {
  dateStyle: "medium",
  timeStyle: "short",
});

const DAY_FORMAT = new Intl.DateTimeFormat();

const toFixedStatus = (status: Publication["status"]): string | null => {
  switch (status) {
    case "ended": {
      return "Ended";
    }

    case "failed": {
      return "Failed";
    }

    case "publishing": {
      return "Publishing…";
    }

    case "removed": {
      return "Unpublished";
    }

    default: {
      return null;
    }
  }
};

const toViewsText = (publication: Publication): string | null => {
  const { views } = publication;

  if (!views) {
    return null;
  }

  return `${views.total} view${pick(views.total === 1, "", "s")}, ${views.last7} this week`;
};

const toStatusText = (publication: Publication, now: number): string => {
  const fixed = toFixedStatus(publication.status);

  if (fixed) {
    return fixed;
  }

  return [
    publishExpiryText(publication.expiresAt, now),
    pick(publication.password, "Password", "Public"),
    toViewsText(publication),
    `v ${publication.versionId.slice(0, SHORT_VERSION)}`,
  ]
    .filter(Boolean)
    .join(" · ");
};

const toVersionTimeText = (committedAt: number | null): string => {
  if (committedAt) {
    return VERSION_FORMAT.format(new Date(committedAt));
  }

  return "Pending";
};

const toDayText = (time: number): string => DAY_FORMAT.format(new Date(time));

const toViewsTip = (publication: Publication): string | null => {
  if (!publication.views) {
    return null;
  }

  return `${publication.views.last7} views in the last 7 days. Counts page opens per day; no personal data.`;
};

export {
  SHORT_VERSION,
  toDayText,
  toStatusText,
  toVersionTimeText,
  toViewsTip,
};
