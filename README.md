# Trivia Launchpad

▎ Build a small "Trivia Pack" web app to test a deployment pipeline — keep it simple, this is a plumbing test, not a product.                                                                                  

  ▎                                                                                                                                                                                                              

  ▎ Flow:                                                                                                                                                                                                        

  ▎ 1. A single-question form (pick a topic: Movies, History, or Science) using react-hook-form + zod validation, styled with shadcn/ui.                                                                         

  ▎ 2. On submit, show a $1 "Unlock Your Trivia Pack" paywall using Stripe Checkout (test mode).                                                                                                                 

  ▎ 3. After payment succeeds, save the order (topic, payment status) to a Supabase table via a migration, and display a static set of 5 trivia questions for that topic on a results page.                      

  ▎ 4. Add basic Supabase email/password auth so a logged-in user can view their past orders on a "My Packs" page.                                                                                               

  ▎                                                                                                                                                                                                              

  ▎ Requirements:                                                                                                                                                                                                

  ▎ - Use TanStack Start + TanStack Router/Query, Tailwind v4, and shadcn/ui, matching the structure of a typical Lovable-generated app.                                                                         

  ▎ - Use Supabase for auth, database, and migrations.                                                                                                                                                           

  ▎ - Use Stripe test mode for payment (no real charges).                                                                                                                                                        

  ▎ - Keep the scope intentionally small — this app exists only to validate a dev → staging → production release process, not to be a polished product. No AI generation needed — static/hardcoded content is    

  ▎ fine.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4b248cfc-09c2-49a7-a012-1436f147fa0f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
