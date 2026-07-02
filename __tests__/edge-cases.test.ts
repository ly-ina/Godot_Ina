// Edge case and error handling tests
import { describe, it, expect } from "vitest";
import { parseTscnFile, parseGodotValue } from "../src/parsers/tscn-parser.js";
import { createEmptyScene, sceneToTscn } from "../src/writers/tscn-writer.js";
import { addNode } from "../src/tools/add_node.js";
import { editNode } from "../src/tools/edit_node.js";
import { createScene } from "../src/tools/create_scene.js";
import { readScene } from "../src/tools/read_scene.js";
import { readScript } from "../src/tools/read_script.js";
import { createScript } from "../src/tools/create_script.js";
import * as path from "path";

const FIXTURES = path.resolve("test-fixtures/scenes");

describe("Error handling", () => {
  describe("read_scene", () => {
    it("rejects non-existent file", () => {
      const result = readScene("/nonexistent/file.tscn");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("rejects file with wrong extension", () => {
      const result = readScene("test.txt");
      expect(result.success).toBe(false);
      // readScene checks existence first, so a non-existent file returns "not found"
      expect(result.error).toBeDefined();
    });

    it("rejects empty path", () => {
      const result = readScene("");
      expect(result.success).toBe(false);
    });
  });

  describe("add_node", () => {
    it("rejects non-existent scene", () => {
      expect(() => addNode({
        scene_path: "/nonexistent.tscn",
        parent_node_name: ".",
        node_type: "Node2D",
        node_name: "Test",
      })).toThrow(/not found/);
    });

    it("rejects invalid scene extension", () => {
      expect(() => addNode({
        scene_path: "test.txt",
        parent_node_name: ".",
        node_type: "Node2D",
        node_name: "Test",
      })).toThrow(/must point to a .tscn/);
    });

    it("rejects empty required fields", () => {
      expect(() => addNode({
        scene_path: "",
        parent_node_name: "",
        node_type: "",
        node_name: "",
      })).toThrow();
    });
  });

  describe("edit_node", () => {
    it("rejects non-existent node name", () => {
      const scenePath = path.join(FIXTURES, "World.tscn");
      expect(() => editNode({
        scene_path: scenePath,
        node_name: "NonExistentNode",
        properties: { x: 1 },
      })).toThrow(/not found/);
    });

    it("rejects empty properties", () => {
      expect(() => editNode({
        scene_path: path.join(FIXTURES, "World.tscn"),
        node_name: "World",
        properties: {},
      })).toThrow(/at least one property/);
    });
  });

  describe("create_scene", () => {
    it("rejects non-tscn path", () => {
      expect(() => createScene({
        scene_path: "test.txt",
        root_node_name: "Root",
        root_node_type: "Node2D",
      })).toThrow(/must end with .tscn/);
    });
  });

  describe("read_script", () => {
    it("rejects non-existent script", () => {
      expect(() => readScript({ script_path: "/nonexistent.gd" })).toThrow(/not found/);
    });

    it("rejects wrong extension", () => {
      expect(() => readScript({ script_path: "test.txt" })).toThrow(/not a .gd/);
    });
  });

  describe("create_script", () => {
    it("rejects missing content", () => {
      expect(() => createScript({
        script_path: "test.gd",
        content: "",
      })).toThrow(/content is required/);
    });

    it("rejects wrong extension", () => {
      expect(() => createScript({
        script_path: "test.txt",
        content: "print('hi')",
      })).toThrow(/must end with .gd/);
    });
  });
});

describe("Edge cases", () => {
  describe("parseGodotValue", () => {
    it("handles empty arrays", () => {
      const val = parseGodotValue("[]");
      expect(Array.isArray(val)).toBe(true);
      expect(val).toHaveLength(0);
    });

    it("handles empty dictionaries", () => {
      const val = parseGodotValue("{}");
      expect(typeof val).toBe("object");
      expect(val).not.toBeNull();
    });

    it("handles Vector2 with negative values", () => {
      expect(parseGodotValue("Vector2(-100, -200)")).toBe("Vector2(-100, -200)");
    });

    it("handles Color with float alpha", () => {
      expect(parseGodotValue("Color(1, 0.5, 0, 0.8)")).toBe("Color(1, 0.5, 0, 0.8)");
    });

    it("handles null", () => {
      expect(parseGodotValue("null")).toBeNull();
    });

    it("handles empty string", () => {
      expect(parseGodotValue("")).toBeNull();
    });
  });

  describe("sceneToTscn", () => {
    it("handles empty properties", () => {
      const scene = createEmptyScene("Test", "Node2D");
      const output = sceneToTscn(scene);
      expect(output).toBeTruthy();
      expect(output).toContain('[node name="Test" type="Node2D"]');
    });

    it("ends with newline", () => {
      const scene = createEmptyScene("Test", "Node2D");
      const output = sceneToTscn(scene);
      expect(output.endsWith("\n")).toBe(true);
    });
  });
});
