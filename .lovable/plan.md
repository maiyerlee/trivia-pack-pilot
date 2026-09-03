# Trivia Pack — deployment pipeline test app

A deliberately small 4-page app that exercises forms, payments, database, and auth end to end.

## Flow

```text
/            pick topic (Movies | History | Science) -> submit
/checkout    $1 "Unlock Your Trivia Pack" -> Stripe Checkout (test mode)
/results     5 hardcoded questions for the paid topic
/my-packs    signed-in user's past orders
/auth        email + password sign in / sign up
```

## What gets built

1. **Topic form (`/`)** — shadcn Card + Select + Button, react-hook-form with a zod schema (topic must be one of the three). Invalid submit shows an inline error.
2. **Paywall (`/checkout`)** — shows the chosen topic and a $1 unlock button. Clicking creates a Stripe Checkout session in test mode and redirects. Success returns to `/results?...`, cancel returns to `/checkout`.
3. **Order persistence** — a Stripe webhook marks the order paid. The results page only renders questions for an order in `paid` state.
4. **Results (`/results`)** — a static 5-question set per topic, held in one file, rendered as a simple numbered list with the answer revealed on click.
5. **Auth (`/auth`)** — email/password sign up and sign in (email confirmation off so the test loop stays fast).
6. **My Packs (`/my-packs`)** — protected page listing the signed-in user's orders (topic, date, status). Orders created while signed in are linked to that user; anonymous purchases stay unlinked.

Styling stays on the default shadcn theme — this is plumbing, not a brand.

## Technical notes

- **Backend**: Lovable Cloud is enabled to provide the database, auth, and migrations.
- **Migration** creates `public.orders` (`id`, `user_id` nullable, `topic`, `status`, `stripe_session_id`, `amount_cents`, `created_at`) with grants, RLS on, and policies so a user can read only their own orders. Writes happen server-side.
- **Payments**: Lovable's built-in Stripe payments in test mode — no Stripe account or API key needed. One $1 one-time product is created after enabling.
- **Server code**: TanStack `createServerFn` for creating the checkout session and reading orders; a public server route under `src/routes/api/public/` for the Stripe webhook, with signature verification before any write.
- **Data reads**: route loaders using `queryClient.ensureQueryData` + `useSuspenseQuery`, per template conventions.
- **Protected page**: `/my-packs` lives under the `_authenticated` layout; `/`, `/checkout`, `/results`, and `/auth` are public.
- Each route gets its own head metadata.

## Out of scope

No AI, no question generation, no admin views, no refunds, no polish pass.
