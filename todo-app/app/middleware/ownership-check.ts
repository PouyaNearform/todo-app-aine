import type { RequestContext } from "~/middleware/request-context";

// SEAM: v1 no-op pass-through. The function exists so that every action handler
// already calls it before invoking the service layer — when a real auth module
// lands, only this body changes (no action callsites change). Future shape:
//
//   if (ctx.principal.kind !== "user") throw new UnauthorizedError(...);
//   if (resourceOwnerId !== null && resourceOwnerId !== ctx.ownerId) {
//     throw new ForbiddenError(...);
//   }
//
// `resourceOwnerId === null` is the create-style call site (no resource yet).

export function checkOwnership(
  _ctx: RequestContext,
  _resourceOwnerId: string | null,
): void {
  // intentional no-op
}

export type { RequestContext };
