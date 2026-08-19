# skillcat-sync

[![SkillCat](https://www.skillcat.es/api/badge/cmszct21e0001lvcp5lwm7yrh)](https://www.skillcat.es/skills/cmszct21e0001lvcp5lwm7yrh)

Links [SkillCat](https://skillcat.es) to a real Claude Code install, so the skills, agents, and
MCP servers you select on the site get installed — or uninstalled — for real, instead of just
copy-pasting a command.

Two ways to run it — pick one, or use both:

## Option A: background daemon (recommended)

A small script that runs continuously and picks up requests within seconds, with no need to
open a Claude Code session at all.

```bash
npx github:miguelmperezh/skillcat-sync
```

First run asks you to link (see **Use** below). If the prompt hangs and never accepts your
paste, you're probably running this somewhere without a real interactive terminal attached (a
chat agent's one-shot command execution, for instance) — use the non-interactive form instead:

```bash
SKILLCAT_LINK_CODE=XXXX-XXXX npx github:miguelmperezh/skillcat-sync
# or
npx github:miguelmperezh/skillcat-sync --code=XXXX-XXXX
```

After linking, it just sits there watching your account. Leave it running in a terminal tab, or
start it however you'd normally run a background process on your machine (`tmux`, a
systemd/launchd service, etc.) — this repo only ships the script itself, not a
platform-specific service installer.

Every request it runs was already confirmed on skillcat.es — name, verified/audit status, and a
liability disclaimer, before you clicked "Sí, enviar" — so the daemon doesn't ask again. It logs
what it's doing as it does it.

## Option B: Claude Code plugin

Ask an already-open Claude Code session to sync on demand, instead of running a separate
process.

```
/plugin marketplace add miguelmperezh/skillcat-sync
/plugin install skillcat-sync@skillcat-sync
```

Then, in a session, ask it to sync with SkillCat. See
[`skillcat-sync/SKILL.md`](skillcat-sync/SKILL.md) for exactly what it does.

## Use (both options)

1. On [skillcat.es/my-installs](https://skillcat.es/my-installs), click **Vincular con Claude
   Code** to get a one-time linking code (10 minutes, single use).
2. Paste it when the daemon or the skill asks for it. The resulting token is saved to
   `~/.skillcat/token` — either option reads the same file, so linking once covers both.
3. Select skills/agents/MCP servers on skillcat.es and send them — they'll be installed or
   removed on this machine.
