import { jsonResponse } from "./_lib/response.js";
import { clearSessionCookies } from "./_lib/session.js";

export async function handler() {
  return jsonResponse(200, { ok: true }, clearSessionCookies());
}
