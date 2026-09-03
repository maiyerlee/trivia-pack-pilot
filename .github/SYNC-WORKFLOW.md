# Dev / production sync workflow

This project runs as two Lovable projects, each tied to its own GitHub repo and
its own Lovable Cloud database:

| Role | Lovable project | Repo | Branch Lovable tracks |
|---|---|---|---|
| Production | trivia-pack-pilot | `maiyerlee/trivia-pack-pilot` | `main` |
| Dev | trivia-launchpad-dev | `maiyerlee/trivia-launchpad-dev` | `main` |

Developers only ever work in the **production repo**. Two GitHub Actions keep
the dev repo in step.

## The two workflows

**`mirror-to-dev.yml`** (runs in the production repo)
Whenever `dev` changes, copy it into the dev repo's `main`. The dev Lovable
project then shows the change.

**`sync-back-to-main-repo.yml`** (runs in the dev repo)
Whenever the dev repo's `main` changes for any reason other than the mirror
above (in practice: someone edited in the dev Lovable editor), copy it back
onto the production repo's `dev` branch.

Both files live in both repos, because the mirror copies `.github/` along with
everything else. Each job checks `github.repository` so only the right one runs.

## Files that are never copied

| File | Why |
|---|---|
| `.env` | Supabase URL, project id and publishable key for *this* environment |
| `supabase/config.toml` | Supabase project id for *this* environment |

Each repo keeps its own copies. A safety step fails the run if a sync would
change either file.

## How loops are prevented

Every commit a sync workflow makes carries `[mirror]` in its message. Each
workflow skips when the triggering commit has that marker, and also exits early
if the copy produces no diff. A real change therefore causes exactly one run in
each direction, the second of which logs "No changes".

## Day-to-day flow

1. Branch from `dev`, do the work, merge the feature into `dev`.
2. The mirror updates the dev Lovable project. Test there.
3. Open a pull request `dev -> main` in the production repo. Merge.
4. In the production Lovable project, click **Publish**.

`main` is protected: it changes only through pull requests. If someone edits in
the *production* Lovable editor, Lovable cannot push to `main` and puts the
change on a `lovable-sync` branch instead. Treat that as a signal that the edit
belonged in the dev project.

## The token

Both workflows push across repos with the repository secret `MIRROR_TOKEN`, a
fine-grained personal access token scoped to exactly these two repos with
**Contents: read/write** and **Workflows: read/write**. It expires after 90
days. To rotate: create a new token with the same settings, then run

```
gh secret set MIRROR_TOKEN -R maiyerlee/trivia-pack-pilot
gh secret set MIRROR_TOKEN -R maiyerlee/trivia-launchpad-dev
```

## Manual run

Either workflow can be started by hand from the Actions tab (**Run workflow**),
for example after rotating the token.
