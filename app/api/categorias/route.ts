import { getCategories } from "@/lib/server/inventory";
import { handleRequest, jsonResponse } from "@/lib/server/http";
import { validateQuery } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRequest(async () => {
    validateQuery(new URL(request.url), []);
    return jsonResponse(await getCategories());
  });
}
