import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import { EmptyState } from "~/components/EmptyState";
import { ErrorState } from "~/components/ErrorState";
import { ListItem } from "~/components/ListItem";
import { LoadingState } from "~/components/LoadingState";
import { TextInput } from "~/components/TextInput";
import { logger } from "~/lib/logger";
import {
  dispatchAddTodo,
  useDispatch,
  useSeedFromLoader,
  useTodos,
} from "~/lib/optimistic-store";
import { checkOwnership } from "~/middleware/ownership-check";
import { buildRequestContext } from "~/middleware/request-context";
import { listTodos } from "~/services/todos";
import { err, ok } from "~/types/envelope";
import type { Todo } from "~/types/todo";
import type { Route } from "./+types/home";

const EMPTY_TODOS: Todo[] = [];

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Todo" },
    { name: "description", content: "A quiet list." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = buildRequestContext(request);
  checkOwnership(ctx, null);
  try {
    const todos = await listTodos(ctx);
    return ok({ todos });
  } catch (e) {
    logger.error(
      {
        event: "loader.list-todos.failed",
        requestId: ctx.requestId,
        err: String(e),
      },
      "list todos loader failed",
    );
    return err("internal", "Couldn't load the list.");
  }
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const dispatch = useDispatch();
  const storeTodos = useTodos();

  useSeedFromLoader(data.ok ? data.data.todos : EMPTY_TODOS);

  const input = (
    <TextInput onSubmit={(description) => dispatchAddTodo(dispatch, description)} />
  );

  if (!data.ok) {
    return (
      <>
        {input}
        <ErrorState
          message={data.error.message}
          onRetry={() => revalidator.revalidate()}
        />
      </>
    );
  }

  if (navigation.state === "loading") {
    return (
      <>
        {input}
        <LoadingState />
      </>
    );
  }

  if (storeTodos.length === 0) {
    return (
      <>
        {input}
        <EmptyState />
      </>
    );
  }

  return (
    <>
      {input}
      <ul role="list">
        {storeTodos.map((t) => (
          <ListItem key={t.id} todo={t} />
        ))}
      </ul>
    </>
  );
}
