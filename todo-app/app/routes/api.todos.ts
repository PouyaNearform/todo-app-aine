import { logger } from "~/lib/logger";
import { TodoCreateSchema } from "~/lib/validation";
import { checkOwnership } from "~/middleware/ownership-check";
import { buildRequestContext } from "~/middleware/request-context";
import { createTodo } from "~/services/todos";
import { err, ok } from "~/types/envelope";
import type { Route } from "./+types/api.todos";

// Resource route: no default export, only `action`. RR7 returns the action's
// Response directly (no HTML wrap), making this a clean JSON API endpoint.
// The optimistic store's dispatchAddTodo posts here.

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json(err("METHOD_NOT_ALLOWED", "Use POST"), {
      status: 405,
    });
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

  const parsed = TodoCreateSchema.safeParse(body);
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

  checkOwnership(ctx, null);

  try {
    const created = await createTodo(ctx, parsed.data);
    return Response.json(ok(created), { status: 201 });
  } catch (e) {
    logger.error(
      {
        event: "action.createTodo.failed",
        requestId: ctx.requestId,
        err: String(e),
      },
      "createTodo action failed",
    );
    return Response.json(err("INTERNAL", "Couldn't save"), { status: 500 });
  }
}
