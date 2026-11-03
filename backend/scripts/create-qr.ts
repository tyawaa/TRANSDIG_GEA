import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import { sha256 } from "../supabase/functions/gea-api/stories.ts";
import { uuid } from "../supabase/functions/gea-api/validation.ts";

/** Buat token acak; simpan hanya hash di DB. File token dibagikan ke pencetak QR museum. */
async function createQrFiles(args: readonly string[]): Promise<void> {
  const [scope, target, expiry, outputPrefix]: readonly (string | undefined)[] = args;
  if (
    (scope !== "entrance" && scope !== "poi") || target === undefined || expiry === undefined ||
    outputPrefix === undefined || args.length !== 4
  ) {
    throw new ValidationError(
      "Gunakan: npm run qr:create -- entrance|poi TARGET_UUID EXPIRES_ISO OUTPUT_PREFIX",
    );
  }
  const targetId: string = uuid(target, "target");
  const expires: Date = new Date(expiry);
  if (!Number.isFinite(expires.getTime()) || expires.getTime() <= Date.now()) {
    throw new ValidationError("expires harus waktu ISO masa depan.");
  }
  const token: string = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(
    (byte: number): string => byte.toString(16).padStart(2, "0"),
  ).join("");
  const hash: string = await sha256(token);
  const column: string = scope === "entrance" ? "id_zona" : "id_poi";
  const sql: string =
    `insert into private.qr_tokens(token_hash,scope,${column},expires_at) values ('${hash}','${scope}','${targetId}','${expires.toISOString()}');\n`;
  await Deno.writeTextFile(`${outputPrefix}.token.txt`, token, { createNew: true, mode: 0o600 });
  await Deno.writeTextFile(`${outputPrefix}.sql`, sql, { createNew: true });
  console.log(
    JSON.stringify({
      event: "qr_prepared",
      scope,
      targetId,
      tokenFile: `${outputPrefix}.token.txt`,
      sqlFile: `${outputPrefix}.sql`,
      expiresAt: expires.toISOString(),
    }),
  );
}

if (import.meta.main) await createQrFiles(Deno.args);
