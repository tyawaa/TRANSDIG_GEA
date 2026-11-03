import { handleRequest } from "./app.ts";
import { type BackendConfig, readConfig } from "./config.ts";

const config: BackendConfig = readConfig(Deno.env.toObject());
Deno.serve((request: Request): Promise<Response> => handleRequest(request, config));
