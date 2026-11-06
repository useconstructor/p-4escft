import { getCatalogue, saveBook } from "@/lib/server/inventory";
import { handleRequest, jsonResponse, mutationInput, savedResponse } from "@/lib/server/http";
import { validateQuery } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRequest(async () => {
    const url = new URL(request.url);
    validateQuery(url, ["q", "category"]);
    return jsonResponse(await getCatalogue(url.searchParams.get("q") ?? "", url.searchParams.get("category") || null));
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRequest(async () => {
    const { key, input } = await mutationInput(request, false);
    return savedResponse(await saveBook("POST", undefined, key, input));
  });
}
