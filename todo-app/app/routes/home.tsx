import { useLoaderData, useNavigation, useRevalidator } from "react-router";
import { EmptyState } from "~/components/EmptyState";
import { ErrorState } from "~/components/ErrorState";
import { ListItem } from "~/components/ListItem";
import { LoadingState } from "~/components/LoadingState";
import { logger } from "~/lib/logger";
import { buildRequestContext } from "~/middleware/request-context";
import { checkOwnership } from "~/middleware/ownership-check";
import { listTodos } from "~/services/todos";
import { err, ok } from "~/types/envelope";
import type { Route } from "./+types/home";

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

function InputArea() {
  // TODO Story 1.10: real TextInput primitive
  return <div />;
}

export default function Home() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();

  if (navigation.state === "loading") {
    return (
      <>
        <InputArea />
        <LoadingState />
      </>
    );
  }

  if (!data.ok) {
    return (
      <>
        <InputArea />
        <ErrorState
          message={data.error.message}
          onRetry={() => revalidator.revalidate()}
        />
      </>
    );
  }

  if (data.data.todos.length === 0) {
    return (
      <>
        <InputArea />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <InputArea />
      <ul role="list">
        {data.data.todos.map((t) => (
          <ListItem key={t.id} todo={t} />
        ))}
      </ul>
    </>
  );
}
