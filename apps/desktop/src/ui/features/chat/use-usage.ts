import { routes } from "@design-studio/actions/workspace/routes";
import type { ComponentUsage } from "@design-studio/contracts/usage-scope";
import { useEffect, useState, startTransition } from "react";

import { call } from "../../platform/http.js";
import { uiStore } from "../../platform/storage.js";
import { usageInput } from "./inline-prompt-model.js";
import type { UsageFields } from "./inline-prompt-model.js";

interface StoredUsage {
  readonly key: string;
  readonly usage: ComponentUsage | null;
}

const readUsage = async (
  fields: UsageFields
): Promise<ComponentUsage | null> => {
  try {
    const data: ComponentUsage = await call(routes.getUsageWorkspace, fields);

    return data;
  } catch {
    return null;
  }
};

const toUsage = (
  stored: StoredUsage | null,
  key: string
): ComponentUsage | null => {
  if (stored?.key === key) {
    return stored.usage;
  }

  return null;
};

const useUsage = (
  file: string | null,
  usedAt: string | null,
  route: string | null
): ComponentUsage | null => {
  const key = `${file}|${usedAt}|${route}`;
  const [stored, setStored] = useState<StoredUsage | null>(null);

  useEffect(() => {
    const projectId = uiStore.get().activeProjectId;

    if (!file || !projectId) {
      return;
    }

    let isLive = true;
    startTransition(async () => {
      const usage = await readUsage(usageInput(projectId, file, usedAt, route));

      if (isLive) {
        setStored({ key, usage });
      }
    });

    return (): void => {
      isLive = false;
    };
  }, [file, usedAt, route, key]);

  return toUsage(stored, key);
};

export { useUsage };
