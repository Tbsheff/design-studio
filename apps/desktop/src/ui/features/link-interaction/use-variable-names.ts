import { useMemo } from "react";

import { useLinks } from "./deps.js";
import { variableNamesOf } from "./variable-model.js";

const useVariableNames = (projectId: string): readonly string[] => {
  const file = useLinks(projectId);

  return useMemo(() => variableNamesOf(file.links), [file.links]);
};

export { useVariableNames };
