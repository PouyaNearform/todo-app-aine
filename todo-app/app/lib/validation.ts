import { z } from "zod";

export const TodoCreateSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(256),
});

export type TodoCreateInput = z.infer<typeof TodoCreateSchema>;
