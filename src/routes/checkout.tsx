import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmOrderPayment, createGuestOrder, createUserOrder } from "@/lib/checkout.functions";
import { isTopic, TOPIC_LABELS, type Topic } from "@/lib/trivia";

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): { topic: Topic | "" } => ({
    topic: isTopic(search['topic']) ? search['topic'] : "",
  }),
  head: () => ({
    meta: [
      { title: "Unlock Your Trivia Pack — $1" },
      { name: "description", content: "Unlock a 5-question trivia pack for $1 (test mode payment)." },
      { property: "og:title", content: "Unlock Your Trivia Pack — $1" },
      { property: "og:description", content: "Unlock a 5-question trivia pack for $1 (test mode payment)." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { topic } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!topic) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Pick a topic first.</p>
        <Button asChild>
          <Link to="/">Choose a topic</Link>
        </Button>
      </main>
    );
  }

  async function handleUnlock() {
    if (!topic) return;
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const { orderId } = data.session
        ? await createUserOrder({ data: { topic } })
        : await createGuestOrder({ data: { topic } });

      await confirmOrderPayment({ data: { orderId } });
      navigate({ to: "/results", search: { orderId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Unlock Your Trivia Pack</CardTitle>
          <CardDescription>
            {TOPIC_LABELS[topic]} — 5 questions, one-time $1 purchase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between rounded-md border border-border p-4">
            <span className="text-sm text-muted-foreground">{TOPIC_LABELS[topic]} pack</span>
            <span className="text-2xl font-semibold">$1.00</span>
          </div>
          <Button className="w-full" onClick={handleUnlock} disabled={loading}>
            {loading ? "Processing…" : "Unlock Your Trivia Pack — $1"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Test mode: no card is charged.
          </p>
          <div className="flex justify-between text-sm">
            <Link to="/" className="underline">
              Change topic
            </Link>
            <Link to="/auth" className="underline">
              Sign in to save this pack
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
