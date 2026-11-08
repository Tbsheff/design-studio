import type { PackSummary } from "@design-studio/contracts";

import type { ApiError } from "../../api.js";

interface ExistingData {
  existing?: PackSummary;
}

const existingOf = (error: ApiError): PackSummary | null => {
  if (error.code !== "pack_exists") {
    return null;
  }

  const data: ExistingData | null = error.data ?? null;

  return data?.existing ?? null;
};

export { existingOf };
