import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listMyOrders, type OrderSummary } from "@/lib/orders.functions";
import { TOPIC_LABELS } from "@/lib/trivia";

export const Route = createFileRoute("/_authenticated/my-packs")({
  head: () => ({
    meta: [
      { title: "My Packs — Trivia Pack" },
      { name: "description", content: "Every trivia pack you've unlocked, with topic and payment status." },
      { property: "og:title", content: "My Packs — Trivia Pack" },
      { property: "og:description", content: "Every trivia pack you've unlocked, with topic and payment status." },
    ],
  }),
  component: MyPacksPage,
});

function MyPacksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    listMyOrders().then((rows) => {
      if (active) setOrders(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>My Packs</CardTitle>
            <CardDescription>Trivia packs linked to your account.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {orders === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No packs yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Purchased</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{TOPIC_LABELS[order.topic]}</TableCell>
                    <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "paid" ? "default" : "secondary"}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === "paid" ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/results" search={{ orderId: order.id }}>
                            View
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Button asChild variant="outline">
            <Link to="/">Buy another pack</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
