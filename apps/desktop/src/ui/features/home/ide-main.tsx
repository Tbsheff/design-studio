import type { ReactElement } from "react";

import { ActivityColumn } from "./activity-column.js";
import { HomeLibraryBlock } from "./home-library-block.js";
import { HomeSidebar } from "./home-sidebar.js";
import { IdeCenter } from "./ide-center.js";
import type { HomeIde } from "./use-home-ide.js";
import type { HomeScreen } from "./use-home-screen.js";

interface IdeMainProps {
  readonly ide: HomeIde;
  readonly onOpen: (projectId: string) => void;
  readonly onOpenRoute: (projectId: string, route: string) => void;
  readonly screen: HomeScreen;
}

const IdeMain = ({
  ide,
  onOpen,
  onOpenRoute,
  screen,
}: IdeMainProps): ReactElement => {
  const { activity, nav, onAttach, onSearch, onTrash } = ide;

  return (
    <div className="ide-main">
      <HomeSidebar
        nav={nav}
        now={activity.now}
        onAttach={onAttach}
        onOpen={onOpen}
        onOpenRoute={onOpenRoute}
        onSearch={onSearch}
        onTrash={onTrash}
        projects={screen.lib.projects}
      />
      <IdeCenter ide={ide} onOpen={onOpen} screen={screen} />
      <ActivityColumn onOpen={onOpen} onSearch={onSearch} state={activity} />
      <div className="ide-library">
        <HomeLibraryBlock screen={screen} />
      </div>
    </div>
  );
};

export { IdeMain };

export type { IdeMainProps };
