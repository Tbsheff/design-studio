import { Config, Context, Effect, Layer } from "effect";

interface CloudSettingsApi {
  readonly authUrl: string;
  readonly rpId: string;
  readonly ucOrigin: string;
  readonly webOrigin: string;
}

const settingsConfig = Config.all({
  authUrl: Config.String("AUTH_URL"),
  rpId: Config.String("RP_ID"),
  ucOrigin: Config.String("UC_ORIGIN"),
  webOrigin: Config.String("WEB_ORIGIN"),
});

class CloudSettings extends Context.Service<CloudSettings, CloudSettingsApi>()(
  "design-studio/platform/CloudSettings"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    CloudSettings,
    Effect.gen(function* make() {
      const settings = yield* settingsConfig;

      return CloudSettings.of(settings);
    })
  );
}

export { CloudSettings };

export type { CloudSettingsApi };
