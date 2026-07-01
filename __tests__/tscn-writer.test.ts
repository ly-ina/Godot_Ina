import { describe, it, expect } from "vitest";
import { TscnParser } from "../src/parsers/tscn-parser.js";
import { sceneToTscn, createEmptyScene } from "../src/writers/tscn-writer.js";
import * as path from "path";

describe("sceneToTscn", () => {
  it("generates valid header format", () => {
    const scene = createEmptyScene("Test", "Node2D");
    const output = sceneToTscn(scene);
    const lines = output.split("\n");

    // Line 1 should be [gd_scene ...]
    expect(lines[0]).toMatch(/^\[gd_scene/);
    expect(lines[0]).toContain("format=3");
    expect(lines[0]).toContain("load_steps=2");
    expect(lines[0]).toMatch(/\]$/); // No trailing space before ]
  });

  it("generates valid root node declaration", () => {
    const scene = createEmptyScene("Root", "Node3D");
    const output = sceneToTscn(scene);
    const lines = output.split("\n");

    const nodeLine = lines.find((l) => l.startsWith("[node"));
    expect(nodeLine).toBeDefined();
    expect(nodeLine).toContain('name="Root"');
    expect(nodeLine).toContain('type="Node3D"');
    expect(nodeLine).toMatch(/\]$/);
  });

  it("creates round-trip compatible output (parse → write → parse)", () => {
    // Create scene + write + parse again
    const original = createEmptyScene("Game", "Node2D");
    const serialized = sceneToTscn(original);

    // Write to temp file and parse back
    const fs = require("fs");
    const tmpFile = path.resolve("test-fixtures/scenes/__roundtrip_test.tscn");
    fs.writeFileSync(tmpFile, serialized, "utf-8");

    const parser = new TscnParser();
    const parsed = parser.parse(tmpFile);

    // Clean up
    fs.unlinkSync(tmpFile);

    expect(parsed.header.format).toBe(3);
    expect(parsed.rootNode).not.toBeNull();
    expect(parsed.rootNode!.name).toBe("Game");
    expect(parsed.rootNode!.type).toBe("Node2D");
  });

  it("includes UID with correct prefix", () => {
    const scene = createEmptyScene("Test", "Node2D");
    const output = sceneToTscn(scene);

    expect(output).toContain("uid=\"uid://");
  });

  it("has no trailing spaces before closing bracket", () => {
    const scene = createEmptyScene("Test", "Node2D");
    const output = sceneToTscn(scene);
    const lines = output.split("\n").filter((l) => l.startsWith("["));

    for (const line of lines) {
      // The last character before newline should be ] not space
      const trimmed = line.trimEnd();
      expect(trimmed).toMatch(/\]$/);
    }
  });
});
