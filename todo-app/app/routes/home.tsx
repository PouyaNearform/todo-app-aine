import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Todo" },
    { name: "description", content: "A quiet list." },
  ];
}

export default function Home() {
  return <div>Hello, list.</div>;
}
