// MCP Server integration tests — spawn the server as a child process
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";

const SERVER_SCRIPT = path.resolve("dist/index.js");
const TEST_PROJECT = path.resolve("test-fixtures/scenes");

let server: ChildProcess | null = null;
let stdoutBuffer = "";

function startServer(): ChildProcess {
  const proc = spawn("node", [SERVER_SCRIPT], { stdio: ["pipe", "pipe", "pipe"] });
  server = proc;
  stdoutBuffer = "";
  proc.stdout!.on("data", (data: Buffer) => { stdoutBuffer += data.toString(); });
  return proc;
}

function sendRequest(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (!server || !server.stdin) { reject(new Error("Server not started")); return; }
    const id = Math.floor(Math.random() * 10000);
    const request = JSON.stringify({ jsonrpc: "2.0", id, method, params: params || {} });
    stdoutBuffer = "";
    const timeout = setTimeout(() => reject(new Error("Response timeout after 30s")), 30000);

    // Accumulate data until a complete JSON-RPC response (newline-delimited)
    const onData = (data: Buffer) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split("\n");
      // If we have at least one complete line, try to parse the first one
      if (lines.length >= 2) {
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            clearTimeout(timeout);
            server?.stdout?.removeListener("data", onData);
            resolve(parsed);
            return;
          } catch {
            // Incomplete JSON — keep buffering
          }
        }
      }
    };

    server.stdout!.on("data", onData);
    server.stdin.write(request + "\n");
  });
}

afterAll(() => { if (server) { server.kill(); server = null; } });

describe("MCP Server — real process integration", () => {
  beforeAll(() => {
    const godotFile = path.join(TEST_PROJECT, "project.godot");
    if (!fs.existsSync(godotFile)) fs.writeFileSync(godotFile, "; Test\nconfig_version=5\n", "utf-8");
  });

  it("responds to tools/list (13 tools)", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/list");
    proc.kill();
    expect(response.jsonrpc).toBe("2.0");
    const result = response.result as Record<string, unknown>;
    expect(Array.isArray(result.tools)).toBe(true);
    expect((result.tools as unknown[]).length).toBe(13);
  }, 60000);

  it("ping returns pong", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/call", { name: "ping", arguments: {} });
    proc.kill();
    const result = response.result as Record<string, unknown>;
    expect(((result.content as Array<{ text: string }>)[0].text)).toBe("pong");
  });

  it("edit_scene read returns scene data", async () => {
    const worldPath = path.resolve("test-fixtures/scenes/World.tscn");
    const proc = startServer();
    const response = await sendRequest("tools/call", {
      name: "edit_scene",
      arguments: { action: "read", scene_path: worldPath },
    });
    proc.kill();
    const result = response.result as Record<string, unknown>;
    const text = ((result.content as Array<{ text: string }>)[0].text) as string;
    expect(text).toContain("World");
  });

  it("returns error for unknown tool", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/call", { name: "nonexistent", arguments: {} });
    proc.kill();
    const result = response.result as Record<string, unknown>;
    expect(result.isError).toBe(true);
  });
});
