import { lazy } from "react";

const ScenarioSection = lazy(async () => {
  const loaded = await import("./scenario-section.js");

  return { default: loaded.ScenarioSection };
});

export { ScenarioSection };
