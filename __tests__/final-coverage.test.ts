// Final coverage push — targets remaining gaps
import { describe, it, expect } from "vitest";
import { createScene } from "../src/tools/impl/create_scene.js";
import { addNode } from "../src/tools/impl/add_node.js";
import * as path from "path";
import * as fs from "fs";

const TMP = path.resolve("test-fixtures/scenes/__final_cov_test.tscn");

afterEach(() => {
  try { if (fs.existsSync(TMP)) fs.unlinkSync(TMP); } catch {}
});

describe("create_scene additional coverage", () => {
  it("creates scene in subdirectory", () => {
    const result = createScene({
      scene_path: TMP,
      root_node_name: "Main",
      root_node_type: "Node3D",
    });
    expect(result).toContain("Main (Node3D)");
    expect(result).toContain("Format: 3");
    expect(fs.existsSync(TMP)).toBe(true);
  });

  it("rejects already existing file", () => {
    // Create first
    createScene({ scene_path: TMP, root_node_name: "R", root_node_type: "Node2D" });
    // Try again
    expect(() => {
      createScene({ scene_path: TMP, root_node_name: "R", root_node_type: "Node2D" });
    }).toThrow(/already exists/);
  });
});

describe("add_node additional coverage", () => {
  beforeEach(() => {
    createScene({ scene_path: TMP, root_node_name: "Root", root_node_type: "Node2D" });
  });

  it("adds node with properties", () => {
    const r = addNode({
      scene_path: TMP,
      parent_node_name: ".",
      node_type: "Camera2D",
      node_name: "Cam",
      properties: { zoom: "Vector2(2, 2)", current: true },
    });
    expect(r).toContain("Properties set: 2");
  });

  it("adds node without properties", () => {
    const r = addNode({
      scene_path: TMP,
      parent_node_name: ".",
      node_type: "Sprite2D",
      node_name: "Sprite",
    });
    expect(r).toContain("Properties set: 0");
  });

  it("rejects duplicate node name", () => {
    addNode({ scene_path: TMP, parent_node_name: ".", node_type: "Node2D", node_name: "Child" });
    expect(() => {
      addNode({ scene_path: TMP, parent_node_name: ".", node_type: "Node2D", node_name: "Child" });
    }).toThrow(/already exists/);
  });
});
