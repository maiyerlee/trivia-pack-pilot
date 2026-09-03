import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrder } from "@/lib/orders.functions";
import { TOPIC_LABELS, TRIVIA } from "@/lib/trivia";

const orderQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["order", orderId],
    queryFn: () => getOrder({ data: { orderId } }),
  });

export const Route = createFileRoute("/results")({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: String(search['orderId'] ?? ""),
  }),
  loaderDeps: ({ search }) => ({ orderId: search.orderId }),
  loader: ({ context, deps }) =>
    deps.orderId ? context.queryClient.ensureQueryData(orderQuery(deps.orderId)) : null,
  head: () => ({
    meta: [
      { title: "Your Trivia Pack — 5 questions" },
      { name: "description", content: "The 5 trivia questions included in your unlocked pack." },
      { property: "og:title", content: "Your Trivia Pack — 5 questions" },
      { property: "og:description", content: "The 5 trivia questions included in your unlocked pack." },
    ],
  }),
  errorComponent: () => <Shell>Something went wrong loading this pack.</Shell>,
  notFoundComponent: () => <Shell>Pack not found.</Shell>,
  component: ResultsPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4 py-12 text-center">
      <p className="text-muted-foreground">{children}</p>
      <div>
        <Button asChild variant="outline">
          <Link to="/">Start over</Link>
        </Button>
      </div>
    </main>
  );
}

function ResultsPage() {
  const { orderId } = Route.useSearch();
  const { data: order } = useSuspenseQuery(orderQuery(orderId));

  if (!order) return <Shell>We couldn't find that order.</Shell>;
  if (order.status !== "paid") {
    return <Shell>This pack isn't unlocked yet (payment status: {order.status}).</Shell>;
  }

  const questions = TRIVIA[order.topic];

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>{TOPIC_LABELS[order.topic]} Trivia Pack</CardTitle>
          <CardDescription>Tap a question to reveal the answer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((question, index) => (
            <QuestionRow key={question.q} index={index} question={question.q} answer={question.a} />
          ))}
          <div className="flex gap-2 pt-4">
            <Button asChild variant="outline">
              <Link to="/">Buy another pack</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/my-packs">My Packs</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function QuestionRow({ index, question, answer }: { index: number; question: string; answer: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setRevealed((value) => !value)}
      className="w-full rounded-md border border-border p-4 text-left transition-colors hover:bg-accent"
    >
      <span className="font-medium">
        {index + 1}. {question}
      </span>
      {revealed ? (
        <span className="mt-2 block text-sm text-muted-foreground">{answer}</span>
      ) : (
        <span className="mt-2 block text-sm text-muted-foreground">Show answer</span>
      )}
    </button>
  );
}
