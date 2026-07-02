// Tests for run_project MCP Tool
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { runGodotProject } from "../src/tools/run_project.js";

const MOCK_PROJECT = path.resolve("test-fixtures/scenes");
const MOCK_PROJECT_GODOT = path.join(MOCK_PROJECT, "project.godot");
// Use a directory that exists but has no project.godot
const EMPTY_DIR = path.resolve("test-fixtures/scripts");

beforeEach(() => {
  if (!fs.existsSync(MOCK_PROJECT_GODOT)) {
    fs.writeFileSync(MOCK_PROJECT_GODOT, "; Test\nconfig_version=5\n", "utf-8");
  }
});

afterEach(() => {
  try { fs.unlinkSync(MOCK_PROJECT_GODOT); } catch {}
});

describe("runGodotProject", () => {
  it("rejects non-existent project path", () => {
    expect(() => runGodotProject({ project_path: "/nonexistent" })).toThrow("not found");
  });

  it("throws for missing project.godot", () => {
    expect(() => runGodotProject({ project_path: EMPTY_DIR })).toThrow("No project.godot");
  });

  it("accepts valid project (will try to find godot and fail with godot error)", () => {
    // It will try to find godot - just verify it doesn't throw a path validation error
    expect(() => runGodotProject({ project_path: MOCK_PROJECT })).not.toThrow("not found");
  });
});
