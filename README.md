# skillcat-sync

A Claude Code plugin that links a session to your [SkillCat](https://skillcat.es) account, so
the skills, agents, and MCP servers you select on the site can be installed — or uninstalled —
for real, instead of just copy-pasting a command.

## Install

```
/plugin marketplace add miguelmperezh/skillcat-sync
/plugin install skillcat-sync@skillcat-sync
```

## Use

1. On [skillcat.es/my-installs](https://skillcat.es/my-installs), click **Vincular con Claude
   Code** to get a one-time linking code.
2. In a Claude Code session, ask it to sync with SkillCat and paste the code when prompted.
3. Select skills/agents/MCP servers on the site and send them to Claude Code — the skill will
   show you each command and ask for confirmation before running anything.

See [`skillcat-sync/SKILL.md`](skillcat-sync/SKILL.md) for exactly what the skill does.
