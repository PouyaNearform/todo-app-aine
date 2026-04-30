type Payload = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", payload: Payload, msg?: string) {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...payload,
    msg,
  });
  console[level](line);
}

export const logger = {
  info: (payload: Payload, msg?: string) => emit("info", payload, msg),
  warn: (payload: Payload, msg?: string) => emit("warn", payload, msg),
  error: (payload: Payload, msg?: string) => emit("error", payload, msg),
};
