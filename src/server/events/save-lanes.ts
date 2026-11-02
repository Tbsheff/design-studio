interface SaveLanes {
  readonly failures: (projectId: string) => string[];
  readonly isPending: (version: { readonly id: string }) => boolean;
  readonly savedId: (id: string) => string;
  readonly settled: (projectId: string | null) => Promise<void>;
}

interface SaveLanesSlot {
  lanes: SaveLanes | null;
}

const bound: SaveLanesSlot = { lanes: null };

const bindSaveLanes = (lanes: SaveLanes): void => {
  bound.lanes = lanes;
};

const boundSaveLanes = (): SaveLanes | null => bound.lanes;

export { bindSaveLanes, boundSaveLanes };

export type { SaveLanes };
