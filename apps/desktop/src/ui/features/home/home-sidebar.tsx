import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SidebarFoot } from "./sidebar-foot.js";
import { SidebarProjects } from "./sidebar-projects.js";
import { SidebarSearch } from "./sidebar-search.js";
import { SidebarTop } from "./sidebar-top.js";
import type { WorkspaceNav } from "./use-workspace-nav.js";
import { WorkspaceList } from "./workspace-list.js";
import { toPinned, toRecent } from "./workspace-model.js";

interface HomeSidebarProps {
  readonly nav: WorkspaceNav;
  readonly now: number;
  readonly onAttach: () => void;
  readonly onOpen: (projectId: string) => void;
  readonly onOpenRoute: (projectId: string, route: string) => void;
  readonly onSearch: () => void;
  readonly onTrash: () => void;
  readonly projects: readonly Project[] | null;
}

const HomeSidebar = ({
  nav,
  now,
  onAttach,
  onOpen,
  onOpenRoute,
  onSearch,
  onTrash,
  projects,
}: HomeSidebarProps): ReactElement => (
  <aside className="ide-side" aria-label={copy.workspacesLabel}>
    <SidebarTop />
    <SidebarSearch onSearch={onSearch} />
    <nav className="ide-tree" aria-label={copy.workspaceTree}>
      <SidebarProjects
        isPinned
        label={copy.pinnedGroup}
        now={now}
        onOpen={onOpen}
        projects={toPinned(projects)}
      />
      <SidebarProjects
        isPinned={false}
        label={copy.recentGroup}
        now={now}
        onOpen={onOpen}
        projects={toRecent(projects)}
      />
      <WorkspaceList nav={nav} onOpen={onOpen} onOpenRoute={onOpenRoute} />
    </nav>
    <SidebarFoot onAttach={onAttach} onTrash={onTrash} />
  </aside>
);

export { HomeSidebar };
