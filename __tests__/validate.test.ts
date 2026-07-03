// Tests for validate_scene and validate_project
import { describe, it, expect } from "vitest";
import * as path from "path";
import { validateScene } from "../src/tools/validate_scene.js";
import { validateProject } from "../src/tools/impl/validate_project.js";

const SCENES_DIR = path.resolve("test-fixtures/scenes");
const WORLD_TSCN = path.join(SCENES_DIR, "World.tscn");

describe("validateScene", () => {
  it("validates a valid scene successfully", () => {
    const result = validateScene({ scene_path: WORLD_TSCN });
    expect(result).toContain("PASS");
    expect(result).toContain("Errors: 0");
  });

  it("detects malformed .tscn files", () => {
    expect(() => validateScene({ scene_path: "/nonexistent/file.tscn" }))
      .toThrow(/not found/);
  });

  it("rejects non-tscn extension", () => {
    expect(() => validateScene({ scene_path: "test.txt" }))
      .toThrow(/must end with .tscn/);
  });

  it("rejects empty scene_path", () => {
    expect(() => validateScene({ scene_path: "" }))
      .toThrow(/scene_path is required/);
  });

  it("includes scene filename in result", () => {
    const result = validateScene({ scene_path: WORLD_TSCN });
    expect(result).toContain("World.tscn");
  });
});

describe("validateProject", () => {
  it("validates a valid project", () => {
    const result = validateProject({ project_path: SCENES_DIR });
    expect(result).toContain("Project Validation");
    expect(result).toContain("Summary");
  });

  it("rejects non-existent project path", () => {
    expect(() => validateProject({ project_path: "/nonexistent" }))
      .toThrow(/not found/);
  });

  it("rejects empty project_path", () => {
    expect(() => validateProject({ project_path: "" }))
      .toThrow(/project_path is required/);
  });
});
