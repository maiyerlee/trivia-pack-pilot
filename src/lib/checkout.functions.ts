import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isTopic, type Topic } from "@/lib/trivia";

const PACK_PRICE_CENTS = 100;

function validateTopic(data: { topic: Topic }) {
  if (!isTopic(data?.topic)) throw new Error("Invalid topic");
  return data;
}

async function insertOrder(topic: Topic, userId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      topic,
      user_id: userId,
      status: "pending",
      amount_cents: PACK_PRICE_CENTS,
      stripe_session_id: `test_session_${crypto.randomUUID()}`,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { orderId: data.id as string };
}

/** Creates a pending order for a guest checkout. */
export const createGuestOrder = createServerFn({ method: "POST" })
  .inputValidator(validateTopic)
  .handler(({ data }) => insertOrder(data.topic, null));

/** Creates a pending order linked to the signed-in user. */
export const createUserOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateTopic)
  .handler(({ data, context }) => insertOrder(data.topic, context.userId));

/**
 * Test-mode payment confirmation. Stands in for the payment provider's
 * webhook: flips a pending order to paid.
 */
export const confirmOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => {
    if (!data?.orderId) throw new Error("orderId is required");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid" })
      .eq("id", data.orderId)
      .eq("status", "pending");

    if (error) throw new Error(error.message);
    return { ok: true };
  });
