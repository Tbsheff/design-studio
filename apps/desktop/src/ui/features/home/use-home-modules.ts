import {
  loadExtras,
  loadLibrary,
  loadSlash,
  loadTemplates,
} from "./lazy-parts-model.js";
import type {
  ExtrasModule,
  LibraryModule,
  SlashModule,
  TemplatesModule,
} from "./lazy-parts-model.js";
import { useModule } from "./use-module.js";

interface HomeModules {
  readonly extras: ExtrasModule | null;
  readonly library: LibraryModule | null;
  readonly slashMod: SlashModule | null;
  readonly templates: TemplatesModule | null;
}

const useHomeModules = (
  hasTemplatesShown: boolean,
  prompt: string
): HomeModules => ({
  extras: useModule(loadExtras, true),
  library: useModule(loadLibrary, true),
  slashMod: useModule(loadSlash, prompt.startsWith("/")),
  templates: useModule(loadTemplates, hasTemplatesShown),
});

export { useHomeModules };

export type { HomeModules };
