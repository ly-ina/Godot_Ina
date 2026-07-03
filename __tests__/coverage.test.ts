// Additional coverage tests for tools and utilities
import { describe, it, expect } from "vitest";
import { listScenes } from "../src/tools/impl/list_scenes.js";
import { readScene } from "../src/tools/impl/read_scene.js";
import { isValidNodeType } from "../src/utils/tree-utils.js";
import { createEmptyScene } from "../src/writers/tscn-writer.js";
import * as path from "path";
import * as fs from "fs";

describe("listScenes", () => {
  it("finds .tscn files in test-fixtures directory", () => {
    const fixtures = path.resolve("test-fixtures");
    const scenes = listScenes(fixtures);
    expect(scenes.length).toBeGreaterThanOrEqual(1);
    expect(scenes[0].path).toContain(".tscn");
    expect(scenes[0].size).toBeGreaterThan(0);
  });

  it("returns empty array for empty directory", () => {
    const emptyDir = path.resolve("test-fixtures/__empty");
    if (!fs.existsSync(emptyDir)) {
      fs.mkdirSync(emptyDir, { recursive: true });
    }
    const scenes = listScenes(emptyDir);
    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes.length).toBe(0);
    fs.rmdirSync(emptyDir);
  });

  it("throws for non-existent path", () => {
    expect(() => listScenes("/nonexistent/path")).toThrow();
  });
});

describe("isValidNodeType", () => {
  it("recognizes common Godot node types", () => {
    expect(isValidNodeType("Node2D")).toBe(true);
    expect(isValidNodeType("CharacterBody2D")).toBe(true);
    expect(isValidNodeType("Sprite2D")).toBe(true);
    expect(isValidNodeType("Camera2D")).toBe(true);
    expect(isValidNodeType("Node")).toBe(true);
    expect(isValidNodeType("Timer")).toBe(true);
    expect(isValidNodeType("AnimationPlayer")).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(isValidNodeType("FooBar")).toBe(false);
    expect(isValidNodeType("")).toBe(false);
    expect(isValidNodeType("CustomNode")).toBe(false);
  });
});

describe("createEmptyScene", () => {
  it("creates scene with correct UID prefix", () => {
    const scene = createEmptyScene("Root", "Node3D");
    expect(scene.header.uid).toMatch(/^uid:\/\//);
    expect(scene.header.uid!.length).toBeGreaterThan(10);
  });

  it("creates scene with empty arrays", () => {
    const scene = createEmptyScene("Root", "Node2D");
    expect(scene.extResources).toEqual([]);
    expect(scene.subResources).toEqual([]);
    expect(scene.connections).toEqual([]);
  });

  it("root node has no parent and no children", () => {
    const scene = createEmptyScene("Root", "Node2D");
    expect(scene.rootNode!.parent).toBeNull();
    expect(scene.rootNode!.children).toEqual([]);
  });
});

describe("read_scene properties", () => {
  it("returns correct data for World.tscn", () => {
    const worldPath = path.resolve("test-fixtures/scenes/World.tscn");
    const result = readScene(worldPath);

    expect(result.success).toBe(true);
    expect(result.scene!.nodeCount).toBe(5);
    expect(result.scene!.header.format).toBe(3);
    expect(result.scene!.rootNode).toBe("World");

    // Check node types
    const nodes = result.scene!.nodes;
    expect(nodes.find(n => n.name === "Player")?.type).toBe("CharacterBody2D");
    expect(nodes.find(n => n.name === "Camera2D")?.type).toBe("Camera2D");
  });
});
