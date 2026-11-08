const formatTime = (ts: number): string => {
  const date = new Date(ts);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : `${date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })} ${date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
};

const formatMs = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined) {
    return "";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

const formatUsd = (amount: number): string => {
  if (amount > 0 && amount < 0.005) {
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const formatRelative = (ts: number, now = Date.now()): string => {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);

  if (min < 1) {
    return "Just now";
  }

  if (min < 60) {
    return `${min} min ago`;
  }

  const hours = Math.floor(min / 60);

  if (hours < 24) {
    return `${hours} h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
};

const baseName = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/).filter(Boolean);

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
