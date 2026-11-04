import { success } from "../http.ts";
import { listPois, poiDetail } from "../stories.ts";
import type { SupabaseGateway } from "../supabase.ts";
import { language, profile, uuid } from "../validation.ts";

export async function routePois(
  request: Request,
  path: string,
  url: URL,
  gateway: SupabaseGateway,
  headers: Headers,
): Promise<Response | null> {
  if (request.method === "GET" && path === "/pois") {
    return success(await listPois(gateway), 200, headers);
  }
  const detail: RegExpMatchArray | null = path.match(/^\/pois\/([^/]+)$/);
  if (request.method === "GET" && detail !== null) {
    return success(
      await poiDetail(
        gateway,
        uuid(detail[1], "idPoi"),
        language(url.searchParams.get("language")),
        profile(url.searchParams.get("profile")),
      ),
      200,
      headers,
    );
  }
  return null;
}
