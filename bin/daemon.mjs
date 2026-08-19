#!/usr/bin/env node
/**
 * skillcat-sync daemon — polls skillcat.es for install/uninstall requests
 * you already confirmed on the website, and runs them for real, right here.
 *
 * Deliberately dependency-free (only Node builtins) so `npx
 * github:miguelmperezh/skillcat-sync` works with no install step.
 *
 * Every request this picks up was already shown to you on skillcat.es (name,
 * verified/audit status, a liability disclaimer) before you clicked "Sí,
 * enviar" — so this does NOT ask again. It only logs what it's doing.
 */
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import readline from "node:readline";

const execAsync = promisify(exec);
const API_BASE = process.env.SKILLCAT_API_BASE ?? "https://www.skillcat.es";
const TOKEN_PATH = join(homedir(), ".skillcat", "token");
const POLL_INTERVAL_MS = 5000;

async function readToken() {
  try {
    return (await readFile(TOKEN_PATH, "utf8")).trim() || null;
  } catch {
    return null;
  }
}

async function saveToken(token) {
  await mkdir(join(homedir(), ".skillcat"), { recursive: true });
  await writeFile(TOKEN_PATH, token, { mode: 0o600 });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function link() {
  console.log("Esta máquina no está vinculada a una cuenta de SkillCat todavía.");

  // Non-interactive path: `SKILLCAT_LINK_CODE=XXXX-XXXX npx github:...` or
  // `npx github:... --code=XXXX-XXXX` — avoids relying on stdin ever
  // reaching this process (it may not, e.g. run through a chat agent's
  // one-shot command execution instead of a real interactive terminal).
  const flagCode = process.argv.find((a) => a.startsWith("--code="))?.slice("--code=".length);
  const code =
    flagCode ??
    process.env.SKILLCAT_LINK_CODE ??
    (await (async () => {
      console.log(
        "Ve a https://www.skillcat.es/my-installs, inicia sesión, y pulsa 'Generar código de vinculación'.\n"
      );
      return ask("Pega el código aquí: ");
    })());

  const res = await fetch(`${API_BASE}/api/cli/link/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, label: process.env.HOSTNAME || "skillcat-sync-daemon" }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    console.error("No se pudo vincular:", data.error ?? "código inválido o caducado");
    process.exit(1);
  }
  await saveToken(data.token);
  console.log("✔ Vinculado correctamente.\n");
  return data.token;
}

/** Human-facing slash commands aren't shell-invocable — translate them. Everything else (claude mcp ..., npx skills ...) is already real and runs as-is. */
function translate(command) {
  return command
    .split("\n")
    .map((line) => {
      const marketplaceAdd = /^\/plugin marketplace add\s+(\S+)/.exec(line);
      if (marketplaceAdd) return `claude plugin marketplace add ${marketplaceAdd[1]}`;
      const install = /^\/plugin install\s+(\S+)/.exec(line);
      if (install) return `claude plugin install ${install[1]} -y`;
      const uninstall = /^\/plugin uninstall\s+(\S+)/.exec(line);
      if (uninstall) return `claude plugin uninstall ${uninstall[1]} -y`;
      return line;
    })
    .join(" && ");
}

async function report(token, id, status) {
  await fetch(`${API_BASE}/api/cli/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id, status }),
  }).catch(() => {});
}

async function runOne(token, item) {
  const verb = item.action === "install" ? "Instalando" : "Desinstalando";
  console.log(`\n${verb} ${item.skillName} (${item.itemType})...`);
  const command = translate(item.command);
  try {
    const { stdout } = await execAsync(command, { timeout: 120_000 });
    if (stdout.trim()) console.log(stdout.trim());
    await report(token, item.id, "done");
    console.log(`✔ ${item.skillName}`);
  } catch (err) {
    console.error(`✗ ${item.skillName}: ${err.message}`);
    await report(token, item.id, "failed");
  }
}

async function poll(token) {
  const res = await fetch(`${API_BASE}/api/cli/pending`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    console.error("\nEl vínculo ya no es válido (revocado, o el token es incorrecto).");
    console.error(`Bórralo y vuelve a vincular: rm ${TOKEN_PATH}`);
    process.exit(1);
  }
  const data = await res.json();
  for (const item of data.data ?? []) {
    await runOne(token, item);
  }
}

async function main() {
  let token = await readToken();
  if (!token) token = await link();

  console.log("skillcat-sync: escuchando tu cuenta de SkillCat (Ctrl+C para salir)");

  for (;;) {
    await poll(token).catch((err) => console.error("Error consultando SkillCat:", err.message));
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main();
