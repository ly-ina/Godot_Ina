// MCP Server integration tests — spawn the server as a child process
import { describe, it, expect, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as fs from "fs";

const SERVER_SCRIPT = path.resolve("dist/index.js");
const TEST_PROJECT = path.resolve("test-fixtures/scenes");

let server: ChildProcess | null = null;
let stdoutBuffer = "";

function startServer(): ChildProcess {
  const proc = spawn("node", [SERVER_SCRIPT], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  server = proc;
  stdoutBuffer = "";

  proc.stdout!.on("data", (data: Buffer) => {
    stdoutBuffer += data.toString();
  });

  return proc;
}

function sendRequest(method: string, params?: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    if (!server || !server.stdin) {
      reject(new Error("Server not started"));
      return;
    }

    const id = Math.floor(Math.random() * 10000);
    const request = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: params || {},
    });

    stdoutBuffer = "";
    const timeout = setTimeout(() => reject(new Error("Response timeout")), 10000);

    server.stdout!.once("data", (data: Buffer) => {
      clearTimeout(timeout);
      const response = data.toString().trim();
      try {
        const parsed = JSON.parse(response);
        resolve(parsed);
      } catch {
        // Might have partial data, try to find JSON in buffer
        const lines = response.split("\n");
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            resolve(parsed);
            return;
          } catch {}
        }
        reject(new Error(`Invalid JSON response: ${response.substring(0, 200)}`));
      }
    });

    server.stdin.write(request + "\n");
  });
}

afterAll(() => {
  if (server) {
    server.kill();
    server = null;
  }
});

describe("MCP Server — real process integration", () => {
  // Ensure project.godot exists
  beforeAll(() => {
    const godotFile = path.join(TEST_PROJECT, "project.godot");
    if (!fs.existsSync(godotFile)) {
      fs.writeFileSync(godotFile, "; Test\nconfig_version=5\n", "utf-8");
    }
  });

  it("responds to tools/list", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/list");
    proc.kill();

    expect(response.jsonrpc).toBe("2.0");
    expect(response.result).toBeDefined();
    const result = response.result as Record<string, unknown>;
    expect(Array.isArray(result.tools)).toBe(true);
    expect((result.tools as unknown[]).length).toBe(37);
  });

  it("ping returns pong", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/call", {
      name: "ping",
      arguments: {},
    });
    proc.kill();

    expect(response.jsonrpc).toBe("2.0");
    const result = response.result as Record<string, unknown>;
    const content = (result.content as Array<{ text: string }>);
    expect(content[0].text).toBe("pong");
  });

  it("list_scenes returns results", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/call", {
      name: "list_scenes",
      arguments: { project_path: TEST_PROJECT },
    });
    proc.kill();

    const result = response.result as Record<string, unknown>;
    const text = ((result.content as Array<{ text: string }>)[0].text) as string;
    expect(text).toContain("scene(s)");
  });

  it("read_scene returns scene data", async () => {
    const worldPath = path.resolve("test-fixtures/scenes/World.tscn");
    const proc = startServer();
    const response = await sendRequest("tools/call", {
      name: "read_scene",
      arguments: { scene_path: worldPath },
    });
    proc.kill();

    const result = response.result as Record<string, unknown>;
    const text = ((result.content as Array<{ text: string }>)[0].text) as string;
    expect(text).toContain("World");
    expect(text).toContain("Node Count: 5");
  });

  it("returns error for unknown tool", async () => {
    const proc = startServer();
    const response = await sendRequest("tools/call", {
      name: "nonexistent",
      arguments: {},
    });
    proc.kill();

    const result = response.result as Record<string, unknown>;
    expect(result.isError).toBe(true);
    const text = ((result.content as Array<{ text: string }>)[0].text) as string;
    expect(text).toContain("Unknown tool");
  });
});
