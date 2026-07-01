import { describe, it, expect } from "vitest";
import { TscnParser, parseGodotValue } from "../src/parsers/tscn-parser.js";
import { SceneNode } from "../src/parsers/tscn-types.js";
import * as path from "path";
import * as fs from "fs";

describe("TscnParser", () => {
  const fixtureDir = path.resolve("test-fixtures/scenes");
  const worldTscn = path.join(fixtureDir, "World.tscn");

  it("parses a valid .tscn file header correctly", () => {
    const parser = new TscnParser();
    const scene = parser.parse(worldTscn);

    expect(scene.header.format).toBe(3);
    expect(scene.header.loadSteps).toBeGreaterThanOrEqual(2);
    // uid is optional in .tscn files, only check if present
    if (scene.header.uid) {
      expect(scene.header.uid).toMatch(/^uid:\/\//);
    }
  });

  it("parses all nodes in World.tscn", () => {
    const parser = new TscnParser();
    const scene = parser.parse(worldTscn);

    expect(scene.rootNode).not.toBeNull();
    expect(scene.rootNode!.name).toBe("World");

    // Count all nodes by flattening
    const count = countAllNodes(scene.rootNode!);
    expect(count).toBe(5); // World, Player, Sprite2D, CollisionShape2D, Camera2D
  });

  it("builds correct node tree structure", () => {
    const parser = new TscnParser();
    const scene = parser.parse(worldTscn);

    const world = scene.rootNode!;
    expect(world.children.length).toBe(2); // Player, Camera2D

    // Player should have 2 children
    const player = world.children.find((c) => c.name === "Player");
    expect(player).toBeDefined();
    expect(player!.children.length).toBe(2); // Sprite2D, CollisionShape2D
    expect(player!.children[0].name).toBe("Sprite2D");
    expect(player!.children[1].name).toBe("CollisionShape2D");
  });

  it("parses ext_resource references", () => {
    const parser = new TscnParser();
    const scene = parser.parse(worldTscn);

    expect(scene.extResources.length).toBeGreaterThanOrEqual(1);
    // Check structure of ext_resources
    for (const ext of scene.extResources) {
      expect(ext.id).toBeDefined();
      expect(ext.type).toBeDefined();
      expect(ext.path).toBeDefined();
      expect(ext.path).toMatch(/^res:\/\//);
    }
  });

  it("handles non-existent file gracefully", () => {
    const parser = new TscnParser();
    expect(() => parser.parse("/nonexistent/file.tscn")).toThrow();
  });
});

describe("parseGodotValue", () => {
  it("parses null", () => {
    expect(parseGodotValue("null")).toBeNull();
  });

  it("parses empty string as null", () => {
    expect(parseGodotValue("")).toBeNull();
  });

  it("parses booleans", () => {
    expect(parseGodotValue("true")).toBe(true);
    expect(parseGodotValue("false")).toBe(false);
  });

  it("parses integers", () => {
    expect(parseGodotValue("42")).toBe(42);
    expect(parseGodotValue("0")).toBe(0);
    expect(parseGodotValue("-5")).toBe(-5);
  });

  it("parses floats", () => {
    expect(parseGodotValue("3.14")).toBe(3.14);
  });

  it("parses quoted strings", () => {
    expect(parseGodotValue('"hello"')).toBe("hello");
  });

  it("preserves ExtResource references as-is", () => {
    const val = parseGodotValue('ExtResource("1_")');
    expect(val).toBe('ExtResource("1_")');
  });

  it("preserves SubResource references as-is", () => {
    const val = parseGodotValue('SubResource("2_")');
    expect(val).toBe('SubResource("2_")');
  });

  it("preserves NodePath as-is", () => {
    const val = parseGodotValue('NodePath("Player/Sprite")');
    expect(val).toBe('NodePath("Player/Sprite")');
  });

  it("preserves Godot built-in types as raw strings", () => {
    expect(parseGodotValue("Vector2(100, 200)")).toBe("Vector2(100, 200)");
    expect(parseGodotValue("Color(1, 0, 0, 1)")).toBe("Color(1, 0, 0, 1)");
    expect(parseGodotValue("Rect2(0, 0, 800, 600)")).toBe("Rect2(0, 0, 800, 600)");
  });

  it("parses simple arrays", () => {
    const arr = parseGodotValue("[1, 2, 3]");
    expect(Array.isArray(arr)).toBe(true);
  });

  it("parses empty array", () => {
    const arr = parseGodotValue("[]");
    expect(Array.isArray(arr)).toBe(true);
    expect(arr).toHaveLength(0);
  });
});

// Helpers
function countAllNodes(node: SceneNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countAllNodes(child);
  }
  return count;
}
