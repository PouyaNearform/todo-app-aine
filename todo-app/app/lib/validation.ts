import { z } from "zod";

export const TodoCreateSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(256),
});

export type TodoCreateInput = z.infer<typeof TodoCreateSchema>;

export const TodoUpdateSchema = z.object({
  completed: z.boolean(),
});

export type TodoUpdateInput = z.infer<typeof TodoUpdateSchema>;
