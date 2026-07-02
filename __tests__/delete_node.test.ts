import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { deleteNode } from "../src/tools/delete_node.js";
import { createScene } from "../src/tools/create_scene.js";
import { addNode } from "../src/tools/add_node.js";
import { parseTscnFile } from "../src/parsers/tscn-parser.js";

const TMP_SCENE = path.resolve("test-fixtures/scenes/__delete_test.tscn");

beforeEach(() => {
  // Create a test scene with a root and several child nodes
  createScene({ scene_path: TMP_SCENE, root_node_name: "Root", root_node_type: "Node2D" });
  addNode({ scene_path: TMP_SCENE, parent_node_name: ".", node_type: "Sprite2D", node_name: "Player" });
  addNode({ scene_path: TMP_SCENE, parent_node_name: "Player", node_type: "Sprite2D", node_name: "Weapon" });
  addNode({ scene_path: TMP_SCENE, parent_node_name: "Player", node_type: "Camera2D", node_name: "Cam" });
  addNode({ scene_path: TMP_SCENE, parent_node_name: ".", node_type: "TileMap", node_name: "Map" });
});

afterEach(() => {
  try { if (fs.existsSync(TMP_SCENE)) fs.unlinkSync(TMP_SCENE); } catch {}
});

describe("deleteNode", () => {
  it("deletes a leaf node (no children)", () => {
    const result = deleteNode({ scene_path: TMP_SCENE, node_name: "Map" });
    expect(result).toContain('Deleted node "Map"');
    // Verify it's gone
    const scene = parseTscnFile(TMP_SCENE);
    expect(scene.rootNode!.children.find((c: { name: string }) => c.name === "Map")).toBeUndefined();
  });

  it("refuses to delete node with children when recursive is false", () => {
    expect(() => deleteNode({ scene_path: TMP_SCENE, node_name: "Player", recursive: false }))
      .toThrow(/has.*child/);
  });

  it("deletes node and its children when recursive is true", () => {
    const result = deleteNode({ scene_path: TMP_SCENE, node_name: "Player", recursive: true });
    expect(result).toContain("including 2 child");
    // Verify Player and its children are gone
    const scene = parseTscnFile(TMP_SCENE);
    expect(scene.rootNode!.children.find((c: { name: string }) => c.name === "Player")).toBeUndefined();
  });

  it("cannot delete the root node", () => {
    expect(() => deleteNode({ scene_path: TMP_SCENE, node_name: "Root" }))
      .toThrow(/root node/);
  });

  describe("error handling", () => {
    it("throws for empty scene_path", () => {
      expect(() => deleteNode({ scene_path: "", node_name: "X" })).toThrow(/scene_path is required/);
    });

    it("throws for wrong extension", () => {
      expect(() => deleteNode({ scene_path: "test.txt", node_name: "X" })).toThrow(/must point to a .tscn/);
    });

    it("throws for empty node_name", () => {
      expect(() => deleteNode({ scene_path: TMP_SCENE, node_name: "" })).toThrow(/node_name is required/);
    });

    it("throws for non-existent scene", () => {
      expect(() => deleteNode({ scene_path: "/nonexistent.tscn", node_name: "X" })).toThrow(/not found/);
    });

    it("throws for non-existent node", () => {
      expect(() => deleteNode({ scene_path: TMP_SCENE, node_name: "NonExistent" })).toThrow(/not found/);
    });
  });
});
