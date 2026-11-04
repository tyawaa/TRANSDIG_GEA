import { jsonBody, success } from "../http.ts";
import type { SupabaseGateway } from "../supabase.ts";
import { type JsonObject, optionLabel, uuid } from "../validation.ts";

export async function routeQuests(
  request: Request,
  path: string,
  gateway: SupabaseGateway,
  userId: string,
  headers: Headers,
): Promise<Response | null> {
  const answer: RegExpMatchArray | null = path.match(
    /^\/sessions\/([^/]+)\/quests\/([^/]+)\/answers$/,
  );
  if (request.method === "POST" && answer !== null) {
    const body: JsonObject = await jsonBody(request);
    return success(
      await gateway.rpc("jawab_quest", {
        p_user_id: userId,
        p_id_sesi: uuid(answer[1], "idSesi"),
        p_id_quest: uuid(answer[2], "idQuest"),
        p_label_opsi: optionLabel(body.labelOpsi),
        p_request_id: uuid(body.requestId, "requestId"),
      }),
      200,
      headers,
    );
  }
  return null;
}
