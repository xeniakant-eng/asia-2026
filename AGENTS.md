<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Starting a work session

Before editing, run `git status --short --branch` and remind the user to pull the latest changes from GitHub. If the working tree is clean, use `git pull --ff-only` before making changes. If there are uncommitted changes, report them and confirm how to proceed before pulling. Do not stash, discard, or commit existing changes automatically.

## Deploying to production

When the user asks to deploy to production, check the working tree and verify the completed changes with a production build. Stage only the completed changes intended for release, excluding secrets and unrelated files. Commit them. Before pushing, verify that the linked Supabase project is the production database for asia-2026, check its migration history with `npx --yes supabase migration list --remote`, and preview pending migrations with `npx --yes supabase db push --dry-run --remote`. If the preview contains only the migrations required for this release, apply them with `npx --yes supabase db push --remote` and verify the migration history again. If the target is unclear, the preview includes unrelated migrations, or a migration check or application fails, stop before pushing and report the issue. After the migration check passes and all required migrations are applied, push to GitHub `origin/main` to trigger Vercel. If the changes are already committed, push the existing commits without creating an empty commit. Verify the Vercel deployment when possible and report whether it went live or was only triggered.

## Session startup

When the user opens a new session for this project and greets you with “hello”, run `git status --short --branch` before asking whether they want to pull the latest changes from GitHub. Report any staged, unstaged, or untracked changes by status only. Never read or display local environment file contents for this check. Wait for the user's approval before pulling, and preserve all local changes.
