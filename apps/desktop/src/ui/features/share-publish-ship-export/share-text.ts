import type { ShareLink } from "@design-studio/contracts/share";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const HOURS_PER_DAY = 24;
const DAYS_SHOWN_FROM = 2;

const toPlural = (count: number, noun: string): string => {
  if (count === 1) {
    return `${count} ${noun}`;
  }

  return `${count} ${noun}s`;
};

const endsText = (link: ShareLink, now: number): string => {
  if (link.revokedAt !== null) {
    return "Turned off";
  }

  const left = link.expiresAt - now;

  if (left <= 0) {
    return "Ended";
  }

  const hours = Math.round(left / MS_PER_HOUR);

  if (hours >= HOURS_PER_DAY * DAYS_SHOWN_FROM) {
    return `Ends in ${Math.round(hours / HOURS_PER_DAY)} days`;
  }

  if (hours >= 1) {
    return `Ends in ${hours} h`;
  }

  return `Ends in ${Math.max(1, Math.round(left / MS_PER_MINUTE))} min`;
};

const linkMeta = (link: ShareLink, now: number): string => {
  const parts = [
    toPlural(link.frames.length, "frame"),
    toPlural(link.comments, "comment"),
  ];

  if (link.live && link.active) {
    parts.unshift(`Live · ${toPlural(link.viewers, "viewer")}`);
  }

  return [...parts, endsText(link, now)].join(" · ");
};

export { linkMeta };
