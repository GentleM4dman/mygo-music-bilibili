// Loads index.js the way MyGo Music does, with a stand-in for its host global,
// so the plugin can be tried from Node (22+) against the real Bilibili.
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SourceTextModule, createContext } from "node:vm";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

const dir = fileURLToPath(new URL("..", import.meta.url));

export async function load({ storage = new Map(), onPrompt = () => {}, fetch: fetchImpl = fetch, settings = {}, webSignIn, main } = {}) {
  const locale = JSON.parse(await readFile(join(dir, "locales/zh-CN.json"), "utf8").catch(() => "{}"));
  const host = {
    platform: process.platform,
    arch: process.arch,
    dir,
    dataDir: await mkdtemp(join(tmpdir(), "bili-")),
    storage: {
      get: (k) => (storage.has(k) ? structuredClone(storage.get(k)) : null),
      set: (k, v) => void storage.set(k, structuredClone(v)),
      remove: (k) => void storage.delete(k),
    },
    setting: (key) => settings[key] ?? "",
    ...(webSignIn ? { webSignIn } : {}),
    t: (text) => locale[text] ?? text,
    language: () => "zh-CN",
    crypto: { md5: (s) => createHash("md5").update(s).digest("hex") },
    openURL: (u) => console.log("openURL", u),
    signInPrompt: onPrompt,
    spawn(command, args) {
      const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
      let err = "";
      let out = "";
      const lines = [];
      const waiting = [];
      let ended = false;
      let failed = null;
      child.on("error", (e) => (failed = e));
      child.stderr.on("data", (d) => (err += d));
      child.stdout.on("data", (d) => {
        out += d;
        let i;
        while ((i = out.indexOf("\n")) >= 0) {
          const line = out.slice(0, i);
          out = out.slice(i + 1);
          waiting.length ? waiting.shift()(line) : lines.push(line);
        }
      });
      const exited = new Promise((resolve) => child.on("close", (code) => {
        ended = true;
        if (out) (waiting.length ? waiting.shift()(out) : lines.push(out));
        while (waiting.length) waiting.shift()(null);
        resolve(code ?? -1);
      }));
      return {
        pid: child.pid,
        write: (s) => child.stdin.write(s),
        closeStdin: () => child.stdin.end(),
        readLine: () => (lines.length ? Promise.resolve(lines.shift()) : ended ? Promise.resolve(null) : new Promise((r) => waiting.push(r))),
        wait: async () => {
          if (failed) throw failed;
          return exited;
        },
        kill: () => child.kill(),
        errorOutput: () => err,
      };
    },
  };
  const source = await readFile(main || join(dir, "index.js"), "utf8");
  const mod = new SourceTextModule(source, {
    identifier: "index.js",
    context: createContext({ URL, URLSearchParams, TextEncoder, TextDecoder, AbortController, fetch: fetchImpl, setTimeout, clearTimeout, console, host, structuredClone }),
  });
  await mod.link(() => { throw new Error("plugins import nothing"); });
  await mod.evaluate();
  return { api: mod.namespace, storage, host };
}
