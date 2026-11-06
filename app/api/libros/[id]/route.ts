import { saveBook } from "@/lib/server/inventory";
import { handleRequest, mutationInput, savedResponse } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleRequest(async () => {
    const { key, input } = await mutationInput(request, true);
    const { id } = await context.params;
    return savedResponse(await saveBook("PATCH", id, key, input));
  });
}
