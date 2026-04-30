import { logger } from "~/lib/logger";
import { TodoUpdateSchema } from "~/lib/validation";
import { withRequestLogging } from "~/lib/with-logging";
import { checkOwnership } from "~/middleware/ownership-check";
import type { RequestContext } from "~/middleware/request-context";
import {
  deleteTodo,
  getTodoOwnership,
  toggleComplete,
} from "~/services/todos";
import { err, ok } from "~/types/envelope";
import type { Route } from "./+types/api.todos.$id";

// Resource route for per-item mutations. Method-dispatched: PATCH (toggle)
// from Story 1.11, DELETE (remove) from Story 1.12.

export const action = withRequestLogging<Route.ActionArgs, Response>(
  "/api/todos/:id",
  async ({ request, params, ctx }) => {
    const id = params.id;
    if (!id) {
      return Response.json(err("VALIDATION", "Missing id"), { status: 400 });
    }

    if (request.method === "PATCH") {
      return handlePatch(request, ctx, id);
    }
    if (request.method === "DELETE") {
      return handleDelete(ctx, id);
    }
    return Response.json(err("METHOD_NOT_ALLOWED", "Use PATCH or DELETE"), {
      status: 405,
    });
  },
);

async function handlePatch(
  request: Request,
  ctx: RequestContext,
  id: string,
): Promise<Response> {
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

async function handleDelete(
  ctx: RequestContext,
  id: string,
): Promise<Response> {
  const existingOwner = await getTodoOwnership(id);
  if (existingOwner === null) {
    // Already-gone is success per the idempotent DELETE contract.
    return Response.json(ok({ deleted: true, row: null }), { status: 200 });
  }
  checkOwnership(ctx, existingOwner);

  try {
    const deleted = await deleteTodo(ctx, id);
    // null here means cross-owner (the WHERE filter blocked it). We treat that
    // as already-gone too — the caller can't act on someone else's row anyway.
    return Response.json(ok({ deleted: true, row: deleted }), { status: 200 });
  } catch (e) {
    logger.error(
      {
        event: "action.deleteTodo.failed",
        requestId: ctx.requestId,
        err: String(e),
      },
      "deleteTodo action failed",
    );
    return Response.json(err("INTERNAL", "Couldn't delete"), { status: 500 });
  }
}
