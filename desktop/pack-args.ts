interface PackOptions {
  readonly identity: string;
  readonly updateUrl: string | null;
  readonly outDir: string | null;
}

const toPackOptions = (env: NodeJS.ProcessEnv): PackOptions => {
  const updateUrl = env.STUDIO_UPDATE_URL || null;

  if (updateUrl && !/^https?:\/\//u.test(updateUrl)) {
    throw new Error(
      `STUDIO_UPDATE_URL must be an http(s) URL, got ${updateUrl}`
    );
  }

  return {
    identity: env.STUDIO_SIGN_IDENTITY || "-",
    outDir: env.STUDIO_PACK_OUT || null,
    updateUrl,
  };
};

const toBuilderArgs = (options: PackOptions): string[] => {
  const args = [
    "--config",
    "electron-builder.yml",
    "--mac",
    "--arm64",
    "--publish",
    "never",
    `-c.mac.identity=${options.identity}`,
  ];

  if (options.updateUrl) {
    args.push(
      "-c.publish.provider=generic",
      `-c.publish.url=${options.updateUrl}`
    );
  }

  if (options.outDir) {
    args.push(`-c.directories.output=${options.outDir}`);
  }

  return args;
};

export { toBuilderArgs, toPackOptions };

export type { PackOptions };
