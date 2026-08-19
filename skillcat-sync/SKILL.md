---
name: skillcat-sync
description: Links this Claude Code session to a SkillCat (skillcat.es) account and syncs pending install/uninstall requests queued from the website — installing or removing the exact skills, agents, and MCP servers the user picked there. Use when the user says things like "sync with SkillCat", "link my SkillCat account", "install my SkillCat picks", "sync skillcat", or pastes a SkillCat linking code (format XXXX-XXXX).
---

# SkillCat Sync

Connects this Claude Code session to the user's SkillCat account (https://skillcat.es) so
skills, agents, and MCP servers they selected on the site can be installed — or removed — for
real, from right here, instead of just copy-pasting a command.

## Token storage

The account link is a single token stored in a local file: `~/.skillcat/token` (plain text,
just the token).

- Read it before doing anything else (`cat ~/.skillcat/token`, or the Read tool).
- If the file doesn't exist or is empty, the session isn't linked yet — go to **Linking**.

## Linking (first time, or if the token file is missing)

1. Tell the user: "This session isn't linked to a SkillCat account yet. Go to
   https://skillcat.es/my-installs, sign in if needed, and click **Vincular con Claude Code**
   to get a linking code (format like `SK7X-P4QM`). Paste the code here when you have it."
2. Wait for the user to give you the code.
3. Exchange it:
   ```
   curl -s -X POST https://www.skillcat.es/api/cli/link/exchange \
     -H "Content-Type: application/json" \
     -d '{"code":"<CODE>","label":"'"$(hostname)"'"}'
   ```
4. The response is `{"ok":true,"token":"sc_live_..."}` on success, or an `"error"` field if the
   code was wrong, already used, or expired (codes last 10 minutes) — tell the user to generate
   a fresh one and retry.
5. On success, create `~/.skillcat/` if needed and write **only** the `sc_live_...` token string
   to `~/.skillcat/token`. Don't print the token back to the user or log it anywhere else —
   treat it like a password.
6. Confirm linking succeeded, then move on to **Syncing**.

## Syncing (the main flow)

1. Fetch what's pending:
   ```
   curl -s https://www.skillcat.es/api/cli/pending \
     -H "Authorization: Bearer $(cat ~/.skillcat/token)"
   ```
2. If `data` is empty, tell the user there's nothing pending and stop.
3. If the response is `{"error":"not_authenticated"}`, the token is invalid or was revoked —
   delete `~/.skillcat/token` and go back to **Linking**.
4. For **each** item in `data`, one at a time:
   - Show the user plainly: the action (install/uninstall), the item's name and type, and the
     **exact command** you're about to run. Never skip this step.
   - Ask for explicit confirmation before running it. If the user declines, or you're running
     unattended with no way to ask, report that item as `"skipped"` (see below) and move on —
     do not run it.
   - If confirmed, translate and run the command:
     - MCP server commands (`claude mcp add ...` / `claude mcp remove ...`) are already real
       shell commands — run them as-is via Bash.
     - Claude Code plugin commands arrive in the human-facing slash-command form
       (`/plugin marketplace add owner/repo`, `/plugin install name@marketplace`,
       `/plugin uninstall name@marketplace`) — these are **not** shell commands. Translate
       before running via Bash:
       - `/plugin marketplace add X` → `claude plugin marketplace add X`
       - `/plugin install Y` → `claude plugin install Y -y`
       - `/plugin uninstall Y` → `claude plugin uninstall Y -y`
   - Report the outcome, whatever it was:
     ```
     curl -s -X POST https://www.skillcat.es/api/cli/complete \
       -H "Authorization: Bearer $(cat ~/.skillcat/token)" \
       -H "Content-Type: application/json" \
       -d '{"id":"<item id>","status":"done"}'
     ```
     Use `"status":"failed"` if the command errored, `"status":"skipped"` if the user declined.
5. Once everything is processed, give a short summary: installed, uninstalled, failed, skipped.

## Safety rules

- **Never** run an install/uninstall command without first showing it to the user and getting a
  yes — even if they asked you to "just sync everything." Show each one and confirm before
  executing, individually or as a reviewed batch.
- Only act on items that came from `/api/cli/pending` — never install or uninstall anything the
  user didn't select on skillcat.es.
- The token in `~/.skillcat/token` is a credential. Never print it, log it, or put it anywhere
  other than the `Authorization` header.
- If a command fails, show the user the real error — don't retry silently or guess a fix.
