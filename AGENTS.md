<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Starting a work session

Before editing, run `git status --short --branch` and remind the user to pull the latest changes from GitHub. If the working tree is clean, use `git pull --ff-only` before making changes. If there are uncommitted changes, report them and confirm how to proceed before pulling. Do not stash, discard, or commit existing changes automatically.

## Deploying to production

When the user asks to deploy to production, check the working tree and verify the completed changes with a production build. Stage only the completed changes intended for release, excluding secrets and unrelated files. Commit them and push to GitHub `origin/main` to trigger Vercel. If the changes are already committed, push the existing commits without creating an empty commit. Verify the Vercel deployment when possible and report whether it went live or was only triggered.
