import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTopic, type Topic } from "@/lib/trivia";

export type OrderSummary = {
  id: string;
  topic: Topic;
  status: string;
  amount_cents: number;
  created_at: string;
};

/**
 * Public read of a single order by its (unguessable) id. Returns only the
 * fields the results page needs.
 */
export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId || typeof data.orderId !== "string") throw new Error("orderId is required");
    return data;
  })
  .handler(async ({ data }): Promise<OrderSummary | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select("id, topic, status, amount_cents, created_at")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row || !isTopic(row.topic)) return null;
    return { ...row, topic: row.topic };
  });

/** Orders belonging to the signed-in user. */
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrderSummary[]> => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, topic, status, amount_cents, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).filter((row) => isTopic(row.topic)) as OrderSummary[];
  });
