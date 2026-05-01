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

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v ?? null;
  }
  return null;
}

export function buildRequestContext(request: Request): RequestContext {
  // Primary transport: X-Browser-Key header (set by browserKeyFetch on every
  // client→server fetch). Fallback: same-origin cookie set by getBrowserKey
  // on first client interaction — needed for SSR-handoff on direct browser
  // navigations (page refresh, deep link) where no fetcher wraps the request.
  const headerValue = request.headers.get("X-Browser-Key") ?? "";
  const cookieValue = readCookie(request, "todo-app-browser-key") ?? "";
  let browserKey = headerValue || cookieValue;

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
