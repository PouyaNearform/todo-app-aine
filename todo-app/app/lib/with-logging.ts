import { logger, truncateBrowserKey } from "~/lib/logger";
import {
  buildRequestContext,
  type RequestContext,
} from "~/middleware/request-context";

type BaseArgs = { request: Request };

type Handler<Args extends BaseArgs, Return> = (
  args: Args & { ctx: RequestContext },
) => Promise<Return>;

/**
 * Wraps a loader or action handler with start/end structured logging.
 * The wrapper builds the RequestContext once and passes it via args.ctx
 * so the handler doesn't have to call buildRequestContext itself.
 */
export function withRequestLogging<Args extends BaseArgs, Return>(
  route: string,
  handler: Handler<Args, Return>,
): (args: Args) => Promise<Return> {
  return async (args: Args) => {
    const ctx = buildRequestContext(args.request);
    const start = performance.now();
    const baseFields = {
      requestId: ctx.requestId,
      browserKey: truncateBrowserKey(ctx.ownerId),
      route,
      method: args.request.method,
    };
    logger.info({ ...baseFields, event: "request.start" }, "request.start");
    try {
      const result = await handler({ ...args, ctx });
      const durationMs = Math.round(performance.now() - start);
      logger.info(
        { ...baseFields, event: "request.end", durationMs },
        "request.end",
      );
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      logger.error(
        {
          ...baseFields,
          event: "request.failed",
          durationMs,
          err: String(err),
        },
        "request.failed",
      );
      throw err;
    }
  };
}
