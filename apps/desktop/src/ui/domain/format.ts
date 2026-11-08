const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const SMALL_COST_USD = 0.005;
const REVOKE_DELAY_MS = 1000;

const formatTime = (ts: number): string => {
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (sameDay) {
    return time;
  }

  const day = date.toLocaleDateString([], { day: "numeric", month: "short" });

  return `${day} ${time}`;
};

const formatMs = (ms: number | null): string => {
  if (ms === null) {
    return "";
  }

  if (ms < MS_PER_SECOND) {
    return `${Math.round(ms)}ms`;
  }

  if (ms < MS_PER_MINUTE) {
    return `${(ms / MS_PER_SECOND).toFixed(1)}s`;
  }

  return `${Math.floor(ms / MS_PER_MINUTE)}m ${Math.round((ms % MS_PER_MINUTE) / MS_PER_SECOND)}s`;
};

const formatUsd = (amount: number): string => {
  if (amount > 0 && amount < SMALL_COST_USD) {
    return "<$0.01";
  }

  return `$${amount.toFixed(2)}`;
};

const downloadBlob = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
};

const formatRelative = (ts: number, now = Date.now()): string => {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / MS_PER_MINUTE);

  if (min < 1) {
    return "Just now";
  }

  if (min < MINUTES_PER_HOUR) {
    return `${min} min ago`;
  }

  const hours = Math.floor(min / MINUTES_PER_HOUR);

  if (hours < HOURS_PER_DAY) {
    return `${hours} h ago`;
  }

  const days = Math.floor(hours / HOURS_PER_DAY);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < DAYS_PER_WEEK) {
    return `${days} days ago`;
  }

  return new Date(ts).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
};

const baseName = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/u).filter(Boolean);

  return parts.at(-1) ?? filePath;
};

export {
  formatTime,
  formatMs,
  formatUsd,
  downloadBlob,
  formatRelative,
  baseName,
};
