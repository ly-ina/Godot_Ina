// Tests for Phase B tools: analyze_project, generate_component
import { describe, it, expect } from "vitest";
import * as path from "path";
import { analyzeProject } from "../src/tools/impl/analyze_project.js";
import { generateComponent } from "../src/tools/impl/generate_component.js";
import * as fs from "fs";

const PROJECT_DIR = path.resolve("test-fixtures/scenes");
const TEST_PROJECT = path.resolve("test-fixtures/__phase_b_test");

describe("analyzeProject", () => {
  it("analyzes a valid project", () => {
    const result = analyzeProject({ project_path: PROJECT_DIR });
    expect(result).toContain("Project Analysis");
    expect(result).toContain("Scenes:");
    expect(result).toContain("Structural Insights");
  });

  it("detects scenes in the project", () => {
    const result = analyzeProject({ project_path: PROJECT_DIR });
    expect(result).toContain("World.tscn");
  });

  it("rejects non-existent path", () => {
    expect(() => analyzeProject({ project_path: "/nonexistent" }))
      .toThrow(/not found/);
  });

  it("rejects empty path", () => {
    expect(() => analyzeProject({ project_path: "" })).toThrow(/required/);
  });
});

describe("generateComponent", () => {
  const TEST_DIR = path.resolve("test-fixtures/scenes/__gen_test");
const TARGET_DIR = path.resolve("test-fixtures/scenes/scenes/__gen_test");
const SCRIPT_DIR = path.resolve("test-fixtures/scenes/scripts/__gen_test");

  afterEach(() => {
    // Clean up all generated files in the target directories
    for (const dir of [TARGET_DIR, SCRIPT_DIR]) {
      if (fs.existsSync(dir)) {
        for (const entry of fs.readdirSync(dir)) {
          try { fs.unlinkSync(path.join(dir, entry)); } catch {}
        }
        try { fs.rmdirSync(dir); } catch {}
      }
    }
    // Also clean up old test dir
    try { if (fs.existsSync(TEST_DIR)) fs.rmdirSync(TEST_DIR); } catch {}
  });

  it("rejects unknown component type", () => {
    expect(() => generateComponent({ project_path: PROJECT_DIR, component: "unknown" }))
      .toThrow(/Unknown component/);
  });

  it("generates a player component", () => {
    const result = generateComponent({
      project_path: PROJECT_DIR,
      component: "player",
      name: "Player",
      target_dir: "scenes/__gen_test",
    });
    expect(result).toContain("Generated component: Player");
    expect(result).toContain("movement");
  });

  it("generates a HUD component", () => {
    const result = generateComponent({
      project_path: PROJECT_DIR,
      component: "hud",
      name: "HUD",
      target_dir: "scenes/__gen_test",
    });
    expect(result).toContain("Generated component: HUD");
  });

  it("generates a collectible component", () => {
    const result = generateComponent({
      project_path: PROJECT_DIR,
      component: "collectible",
      target_dir: "scenes/__gen_test",
    });
    expect(result).toContain("Generated component: Collectible");
  });

  it("rejects missing params", () => {
    expect(() => generateComponent({ project_path: "", component: "" }))
      .toThrow(/required/);
  });
});
