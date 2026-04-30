import { TodoCreateSchema, TodoUpdateSchema } from "./validation";

describe("TodoCreateSchema", () => {
  const validId = "11111111-2222-4333-8444-555555555555";

  it("accepts a well-formed payload", () => {
    const result = TodoCreateSchema.safeParse({
      id: validId,
      description: "buy milk",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when id is not a UUID", () => {
    const result = TodoCreateSchema.safeParse({
      id: "not-a-uuid",
      description: "buy milk",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when description is empty", () => {
    const result = TodoCreateSchema.safeParse({
      id: validId,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when description exceeds 256 characters", () => {
    const result = TodoCreateSchema.safeParse({
      id: validId,
      description: "x".repeat(257),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 256 characters", () => {
    const result = TodoCreateSchema.safeParse({
      id: validId,
      description: "x".repeat(256),
    });
    expect(result.success).toBe(true);
  });
});

describe("TodoUpdateSchema", () => {
  it("accepts { completed: true }", () => {
    expect(TodoUpdateSchema.safeParse({ completed: true }).success).toBe(true);
  });

  it("accepts { completed: false }", () => {
    expect(TodoUpdateSchema.safeParse({ completed: false }).success).toBe(true);
  });

  it("rejects non-boolean completed", () => {
    expect(TodoUpdateSchema.safeParse({ completed: "yes" }).success).toBe(false);
  });

  it("rejects when completed is missing", () => {
    expect(TodoUpdateSchema.safeParse({}).success).toBe(false);
  });
});
