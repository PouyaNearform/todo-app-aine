// Wire contract for every loader and action: discriminated union the client
// branches on. TypeScript narrows naturally on `data.ok`.

export type Envelope<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export const ok = <T>(data: T): Envelope<T> => ({ ok: true, data });

export const err = (
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): Envelope<never> => ({
  ok: false,
  error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) },
});
