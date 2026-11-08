import type { PortFlowPage, PortFlowPlan } from "@design-studio/contracts/port";
import { useCallback, useState } from "react";

interface PagePicks {
  all: PortFlowPage[];
  links: number;
  picked: PortFlowPage[];
  toggle: (page: string) => void;
}

const countLinks = (
  flow: PortFlowPlan | null,
  off: ReadonlySet<string>
): number => {
  if (!flow) {
    return 0;
  }

  return flow.links.filter(
    (link) =>
      !off.has(link.from) && !off.has(link.page) && link.from !== link.page
  ).length;
};

const usePagePicks = (flow: PortFlowPlan | null): PagePicks => {
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set());
  const all = flow?.pages ?? [];
  const picked = all.filter((page) => !off.has(page.path));

  const toggle = useCallback((page: string): void => {
    setOff((prev) => {
      const next = new Set(prev);

      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }

      return next;
    });
  }, []);

  const links = countLinks(flow, off);

  return { all, links, picked, toggle };
};

export { usePagePicks };

export type { PagePicks };
