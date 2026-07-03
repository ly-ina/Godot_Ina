// Final coverage push — target last remaining uncovered branches
import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";

// ── Tool files ──
import { runGodotProject } from "../src/tools/run_project.js";
import { readScript } from "../src/tools/read_script.js";
import { readScene } from "../src/tools/read_scene.js";
import { listScenes, findTscnFiles, getFileInfo } from "../src/tools/list_scenes.js";
import { executeTool } from "../src/tools/dispatch.js";

// ── Writer files ──
import { createEmptyScene, sceneToTscn } from "../src/writers/tscn-writer.js";

// ── Parser files ──
import { parseTscnFile } from "../src/parsers/tscn-parser.js";

// ============================================================
// run_project.ts — line 23: empty project_path
// ============================================================
describe("run_project — empty path check (line 23)", () => {
  it("throws for empty project_path", () => {
    expect(() => runGodotProject({ project_path: "" })).toThrow(/project_path is required/);
  });
});

// ============================================================
// read_script.ts — line 16: empty script_path
// ============================================================
describe("read_script — empty path (line 16)", () => {
  it("throws for empty script_path", () => {
    expect(() => readScript({ script_path: "" })).toThrow(/script_path is required/);
  });
});

// ============================================================
// read_scene.ts — line 35: extension check with existing file
// (non-.tscn file that exists)
// ============================================================
describe("read_scene — extension check with existing file (line 35)", () => {
  const tmpFile = path.resolve("test-fixtures/scenes/__not_a_scene.txt");
  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("rejects file with wrong extension even if it exists", () => {
    fs.writeFileSync(tmpFile, "not a scene", "utf-8");
    const result = readScene(tmpFile);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not a .tscn scene file");
  });
});

// ============================================================
// list_scenes.ts — lines 62, 35, 51
// ============================================================
describe("list_scenes — remaining branches", () => {
  const tmpFile = path.resolve("test-fixtures/scenes/__tmp_file.txt");

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("throws when path is a file, not a directory (line 62)", () => {
    fs.writeFileSync(tmpFile, "test", "utf-8");
    expect(() => listScenes(tmpFile)).toThrow(/not a directory/);
  });

  it("findTscnFiles catches readdir error and logs (line 35)", () => {
    // Passing a file path (not a dir) to findTscnFiles triggers readdirSync error
    const result = findTscnFiles(tmpFile);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("getFileInfo returns null for non-existent file (line 51)", () => {
    const info = getFileInfo("/nonexistent/path.tscn");
    expect(info).toBeNull();
  });
});

// ============================================================
// dispatch.ts — lines 151-155 (list_scenes), 188 (read_script), 220 (create_script)
// ============================================================
describe("dispatch.ts — remaining handler paths", () => {
  const scenesDir = path.resolve("test-fixtures/scenes");
  const tmpScript = path.resolve("test-fixtures/scripts/__dispatch_test.gd");
  const tmpScene = path.resolve("test-fixtures/scenes/__dispatch_script.tscn");

  afterEach(() => {
    [tmpScript, tmpScene].forEach((f) => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    });
  });

  it("list_scenes via analyze_project (lines 151-155)", () => {
    const result = executeTool("analyze_project", { action: "list_scenes", project_path: scenesDir });
    expect(result.content[0].text).toContain(".tscn");
    expect(result.content[0].text).toContain("World");
  });

  it("read_script via edit_script (line 188)", () => {
    fs.writeFileSync(tmpScript, "extends Node2D\n\nfunc _ready():\n\tpass\n", "utf-8");
    const result = executeTool("edit_script", { action: "read", script_path: tmpScript });
    expect(result.content[0].text).toContain("extends Node2D");
  });

  it("create_script via edit_script (line 220)", () => {
    const result = executeTool("edit_script", {
      action: "create",
      script_path: tmpScript,
      content: "extends Node2D\nfunc _ready():\n\tpass\n",
    });
    expect(result.content[0].text).toContain("Script created");
  });

  it("list_scenes via analyze_project with no args fails gracefully", () => {
    const result = executeTool("analyze_project", { action: "list_scenes" });
    expect(result.isError).toBe(true);
  });
});

// ============================================================
// tscn-writer.ts — line 223: Symbol value hits fallback
// Fix: pass actual Symbol, not String(Symbol)
// ============================================================
describe("tscn-writer — symbol fallback (line 223)", () => {
  it("converts Symbol value via fallback string conversion", () => {
    const scene = createEmptyScene("Root", "Node2D");
    // Direct Symbol value — not stringified first
    scene.rootNode!.properties["fallback"] = Symbol("test");
    const tscn = sceneToTscn(scene);
    // Symbol("test") converts to "Symbol(test)" via String()
    expect(tscn).toContain("Symbol(");
  });

  it("converts function via fallback string conversion", () => {
    const scene = createEmptyScene("Root", "Node2D");
    scene.rootNode!.properties["fn"] = function someFunc() { return 42; } as unknown as string;
    const tscn = sceneToTscn(scene);
    expect(tscn).toContain("someFunc");
  });
});

// ============================================================
// tscn-parser.ts remaining lines 244, 340
// ============================================================
describe("tscn-parser — remaining uncovered lines", () => {
  it("parses connection block with all fields", () => {
    const parsed = parseTscnFile(path.resolve("test-fixtures/scenes/World.tscn"));
    // World.tscn has a connection: body_entered from=Player to=.
    expect(parsed.connections.length).toBeGreaterThan(0);
    expect(parsed.connections[0].signal).toBe("body_entered");
    expect(parsed.connections[0].from).toBe("Player");
    expect(parsed.connections[0].to).toBe(".");
  });
});
