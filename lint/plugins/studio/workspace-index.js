import { noDeadGlob } from "./glob-rules.js";
import {
  boundaryPackageElement,
  docsLinkResolves,
  generatedFresh,
  lintCoversWorkspace,
  packageExportNamed,
  packageExportSpecifier,
  packageNoAppConfig,
  packageTypecheckReference,
  rootPackageConfig,
} from "./workspace-fact-rules.js";
import {
  noAppRootJoin,
  noEmptyOutputFallback,
  noNpmText,
  noOldPathForm,
  noPackageForwardShim,
  noPackageJsSuffix,
  noPlainCoreModule,
  noSilentSkip,
  noStaleBinPath,
} from "./workspace-rules.js";

const workspaceRules = {
  "boundary-package-element": boundaryPackageElement,
  "docs-link-resolves": docsLinkResolves,
  "generated-fresh": generatedFresh,
  "lint-covers-workspace": lintCoversWorkspace,
  "no-app-root-join": noAppRootJoin,
  "no-dead-glob": noDeadGlob,
  "no-empty-output-fallback": noEmptyOutputFallback,
  "no-npm-text": noNpmText,
  "no-old-path-form": noOldPathForm,
  "no-package-forward-shim": noPackageForwardShim,
  "no-package-js-suffix": noPackageJsSuffix,
  "no-plain-core-module": noPlainCoreModule,
  "no-silent-skip": noSilentSkip,
  "no-stale-bin-path": noStaleBinPath,
  "package-export-named": packageExportNamed,
  "package-export-specifier": packageExportSpecifier,
  "package-no-app-config": packageNoAppConfig,
  "package-typecheck-reference": packageTypecheckReference,
  "root-package-config": rootPackageConfig,
};

export { noFixableOff, noStudioOverride } from "./lint-rules.js";

export { workspaceRules };
