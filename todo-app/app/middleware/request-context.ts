// SEAM: Service-layer code MUST consume `ctx.ownerId`, never `ctx.principal.browserKey`.
// `ownerId` is the semantic name (the entity owner); `browserKey` is the v1 mechanism.
// When a real auth module lands, only this file changes — it adds the `'user'` principal
// variant and computes `ownerId` from `userId`. Service code stays unchanged. See Gap I-1
// in architecture.md for the full rationale.

import { logger } from "~/lib/logger";

export type Principal =
  | { kind: "browser-key"; browserKey: string }
  | { kind: "user"; userId: string };

export type RequestContext = {
  requestId: string;
  principal: Principal;
  ownerId: string;
};

export function buildRequestContext(request: Request): RequestContext {
  const headerValue = request.headers.get("X-Browser-Key") ?? "";
  let browserKey = headerValue;

  if (!browserKey) {
    browserKey = crypto.randomUUID();
    logger.warn(
      {
        event: "browser-key.missing",
        path: new URL(request.url).pathname,
      },
      "X-Browser-Key absent; generated server-side fallback",
    );
  }

  const principal: Principal = { kind: "browser-key", browserKey };
  const ownerId = deriveOwnerId(principal);

  return {
    requestId: crypto.randomUUID(),
    principal,
    ownerId,
  };
}

function deriveOwnerId(principal: Principal): string {
  switch (principal.kind) {
    case "browser-key":
      return principal.browserKey;
    case "user":
      return principal.userId;
  }
}
