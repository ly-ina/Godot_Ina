// Final edge cases — target literally last uncovered lines
import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";

// ── Parser ──
import { parseTscnFile, parseGodotValue } from "../src/parsers/tscn-parser.js";

// ── Tools ──
import { readScene } from "../src/tools/read_scene.js";
import { listScenes } from "../src/tools/list_scenes.js";
import { addNode } from "../src/tools/add_node.js";
import { createScene } from "../src/tools/create_scene.js";

// ── Writers ──
import { writeSceneToFile } from "../src/writers/tscn-writer.js";

// ============================================================
// tscn-parser.ts line 244 — no root node, fallback to first node
// ============================================================
describe("tscn-parser — no root node (line 244)", () => {
  const tmpScene = path.resolve("test-fixtures/scenes/__no_root.tscn");

  afterEach(() => {
    try { fs.unlinkSync(tmpScene); } catch {}
  });

  it("uses first node when no root node found", () => {
    // All nodes have non-null parent → no node qualifies as root
    const content = [
      "[gd_scene load_steps=1 format=3]",
      "",
      "[node name=\"Child\" type=\"Node2D\" parent=\".\"]",
      "",
    ].join("\n");
    fs.writeFileSync(tmpScene, content, "utf-8");
    // Should not throw
    const parsed = parseTscnFile(tmpScene);
    expect(parsed.rootNode).toBeDefined();
    expect(parsed.rootNode!.name).toBe("Child");
  });
});

// ============================================================
// tscn-parser.ts line 340 — parseGodotValue fallback
// ============================================================
describe("tscn-parser — parseGodotValue fallback (line 340)", () => {
  it("returns raw string for non-matching values", () => {
    // A value like "hello" doesn't match any special case → returns as-is
    const result = parseGodotValue("hello");
    expect(result).toBe("hello");
  });
});

// ============================================================
// read_scene.ts line 67 — catch block for parse errors
// ============================================================
describe("read_scene — catch parse error (line 67)", () => {
  const badScene = path.resolve("test-fixtures/scenes/__malformed.tscn");

  afterEach(() => {
    try {
      if (fs.existsSync(badScene)) {
        const stat = fs.statSync(badScene);
        if (stat.isDirectory()) {
          fs.rmdirSync(badScene);
        } else {
          fs.unlinkSync(badScene);
        }
      }
    } catch {}
  });

  it("returns error on malformed scene file", () => {
    // Create a directory with .tscn name → readFileSync will throw EISDIR
    try { fs.mkdirSync(badScene, { recursive: true }); } catch {}
    const result = readScene(badScene);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================
// list_scenes.ts line 28 — filter out __ prefixed files
// ============================================================
describe("list_scenes — filter __ prefixed files (line 28)", () => {
  const tmpFile = path.resolve("test-fixtures/scenes/__hidden_test.tscn");

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("excludes files starting with __", () => {
    fs.writeFileSync(tmpFile, "[gd_scene format=3]\n", "utf-8");
    const scenes = listScenes(path.resolve("test-fixtures/scenes"));
    const found = scenes.find(s => s.path.includes("__hidden_test"));
    expect(found).toBeUndefined();
  });
});

// ============================================================
// add_node.ts line 118 — recursive collectNames with children
// ============================================================
describe("add_node — recursive collectNames in error msg (line 118)", () => {
  const tmpScene = path.resolve("test-fixtures/scenes/__collect_names.tscn");
  const projectDir = path.resolve("test-fixtures/scenes");

  afterEach(() => {
    try { fs.unlinkSync(tmpScene); } catch {}
  });

  it("lists child node names in parent-not-found error", () => {
    // Create scene with root + children → collectNames recurses into children
    createScene({
      scene_path: tmpScene,
      root_node_name: "Root",
      root_node_type: "Node2D",
      project_path: projectDir,
    });
    // Add a child
    addNode({
      scene_path: tmpScene,
      parent_node_name: ".",
      node_type: "Sprite2D",
      node_name: "Child1",
    });
    // Add nested child
    addNode({
      scene_path: tmpScene,
      parent_node_name: "Child1",
      node_type: "Sprite2D",
      node_name: "Child2",
    });
    // Now try to add to a non-existent parent — error should list Root, Child1, Child2
    try {
      addNode({
        scene_path: tmpScene,
        parent_node_name: "NonExistent",
        node_type: "Sprite2D",
        node_name: "Orphan",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      expect(msg).toContain("Root");
      expect(msg).toContain("Child1");
      expect(msg).toContain("Child2");
    }
  });
});
