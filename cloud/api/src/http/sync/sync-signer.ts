import { Config, Context, Effect, Layer } from "effect";

interface SyncSignerApi {
  readonly sign: (orgId: string, projectId: string) => Effect.Effect<string>;
}

const HEX_RADIX = 16;

const encoder = new TextEncoder();

const toHex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(HEX_RADIX).padStart(2, "0"))
    .join("");

const makeSigner = (secret: string): SyncSignerApi => ({
  sign: Effect.fn("SyncSigner.sign")(function* run(orgId, projectId) {
    const key = yield* Effect.promise(() =>
      crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign"]
      )
    );

    const bytes = yield* Effect.promise(() =>
      crypto.subtle.sign("HMAC", key, encoder.encode(`${orgId}:${projectId}`))
    );

    return toHex(bytes);
  }),
});

class SyncSigner extends Context.Service<SyncSigner, SyncSignerApi>()(
  "design-studio/http/SyncSigner"
) {
  declare public readonly access: "read";

  public static readonly layer = Layer.effect(
    SyncSigner,
    Effect.gen(function* make() {
      const secret = yield* Config.String("CLOUD_REF_SECRET").pipe(
        Effect.orDie
      );

      return SyncSigner.of(makeSigner(secret));
    })
  );

  public static readonly layerTest = Layer.succeed(
    SyncSigner,
    SyncSigner.of(makeSigner("test-secret"))
  );
}

export { SyncSigner };

export type { SyncSignerApi };
