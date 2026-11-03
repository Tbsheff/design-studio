type Tab = "routes" | "flow" | "logs" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "routes", label: "Routes" },
  { id: "flow", label: "Flow" },
  { id: "logs", label: "Log" },
  { id: "settings", label: "Settings" },
];

export { TABS };

export type { Tab };
