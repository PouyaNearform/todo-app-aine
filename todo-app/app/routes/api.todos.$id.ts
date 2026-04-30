import { logger } from "~/lib/logger";
import { TodoUpdateSchema } from "~/lib/validation";
import { checkOwnership } from "~/middleware/ownership-check";
import { buildRequestContext } from "~/middleware/request-context";
import { getTodoOwnership, toggleComplete } from "~/services/todos";
import { err, ok } from "~/types/envelope";
import type { Route } from "./+types/api.todos.$id";

// Resource route for per-item mutations. PATCH (toggle) lands in Story 1.11;
// DELETE lands in Story 1.12 as a method branch in this same file.

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    return Response.json(err("METHOD_NOT_ALLOWED", "Use PATCH"), {
      status: 405,
    });
  }

  const id = params.id;
  if (!id) {
    return Response.json(err("VALIDATION", "Missing id"), { status: 400 });
  }

  const ctx = buildRequestContext(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(err("VALIDATION", "Invalid JSON body"), {
      status: 400,
    });
  }

  const parsed = TodoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      err(
        "VALIDATION",
        "Invalid input",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
      ),
      { status: 400 },
    );
  }

  const existingOwner = await getTodoOwnership(id);
  if (existingOwner === null) {
    return Response.json(err("NOT_FOUND", "Todo not found"), { status: 404 });
  }
  checkOwnership(ctx, existingOwner);

  try {
    const updated = await toggleComplete(ctx, id, parsed.data.completed);
    if (updated === null) {
      // Race between the ownership check and the update, OR cross-owner
      // protection via the WHERE filter. Either way, behave as not-found.
      return Response.json(err("NOT_FOUND", "Todo not found"), { status: 404 });
    }
    return Response.json(ok(updated), { status: 200 });
  } catch (e) {
    logger.error(
      {
        event: "action.toggleComplete.failed",
        requestId: ctx.requestId,
        err: String(e),
      },
      "toggleComplete action failed",
    );
    return Response.json(err("INTERNAL", "Couldn't update"), { status: 500 });
  }
}
