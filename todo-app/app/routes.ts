import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("api/todos", "routes/api.todos.ts"),
  route("api/todos/:id", "routes/api.todos.$id.ts"),
] satisfies RouteConfig;
