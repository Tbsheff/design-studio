const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();

  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : `${d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })} ${d.toLocaleTimeString(undefined, {
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

const formatUsd = (n: number): string => {
  if (n > 0 && n < 0.005) {
    return "<$0.01";
  }

  return `$${n.toFixed(2)}`;
};

const downloadBlob = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
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

const baseName = (p: string): string => {
  const parts = p.split(/[\\/]/).filter(Boolean);

  return parts.at(-1) ?? p;
};

export {
  formatTime,
  formatMs,
  formatUsd,
  downloadBlob,
  formatRelative,
  baseName,
};
