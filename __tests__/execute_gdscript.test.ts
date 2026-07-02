// Tests for execute_gdscript MCP Tool
import { describe, it, expect } from "vitest";
import * as path from "path";
import { executeGDScript } from "../src/tools/execute_gdscript.js";

const SCENES_DIR = path.resolve("test-fixtures/scenes");

describe("executeGDScript", () => {
  it("rejects missing code", () => {
    expect(() => executeGDScript({ code: "", project_path: SCENES_DIR }))
      .toThrow(/code is required/);
  });

  it("rejects missing project_path", () => {
    expect(() => executeGDScript({ code: "print('hi')", project_path: "" }))
      .toThrow(/project_path is required/);
  });

  it("rejects non-existent project path", () => {
    expect(() => executeGDScript({ code: "print('hi')", project_path: "/nonexistent" }))
      .toThrow(/not found/);
  });

  it("tries to execute with Godot if available", () => {
    // If GODOT_PATH is set, this will actually run Godot
    // Otherwise, it'll throw about Godot not found
    const godotPath = process.env.GODOT_PATH;
    if (godotPath) {
      const result = executeGDScript({
        code: 'print("hello from mcp")',
        project_path: SCENES_DIR,
        timeout: 10000,
      });
      expect(result).toContain("GDScript Execution");
    } else {
      // Without Godot, expect the not-found error
      expect(() => executeGDScript({
        code: 'print("hello")',
        project_path: SCENES_DIR,
      })).toThrow(/Godot executable not found/);
    }
  });
});
