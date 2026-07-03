// Tests for Phase A tools: batch_edit_script, init_project
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { batchEditScript } from "../src/tools/impl/batch_edit_script.js";
import { initProject } from "../src/tools/init_project.js";

const TMP_DIR = path.resolve("test-fixtures/__batch_test_project");
const NEW_PROJECT = path.resolve("test-fixtures/__new_project");

afterEach(() => {
  // Clean up batch test project
  try {
    if (fs.existsSync(TMP_DIR)) {
      rmDirRecursive(TMP_DIR);
    }
  } catch {}
  // Clean up new project
  try {
    if (fs.existsSync(NEW_PROJECT)) {
      rmDirRecursive(NEW_PROJECT);
    }
  } catch {}
});

function rmDirRecursive(dir: string) {
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        rmDirRecursive(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    fs.rmdirSync(dir);
  }
}

function createTestProject() {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.mkdirSync(path.join(TMP_DIR, "scripts"), { recursive: true });
  fs.writeFileSync(path.join(TMP_DIR, "scripts", "player.gd"),
    'extends CharacterBody2D\nconst SPEED = 300\nfunc _ready():\n\tprint("hello")\n', "utf-8");
  fs.writeFileSync(path.join(TMP_DIR, "scripts", "enemy.gd"),
    'extends CharacterBody2D\nconst SPEED = 100\nfunc _ready():\n\tprint("enemy")\n', "utf-8");
}

// ── batch_edit_script ──
describe("batchEditScript", () => {
  it("replaces text across multiple files", () => {
    createTestProject();
    const result = batchEditScript({ project_path: TMP_DIR, search: "SPEED", replace: "MOVESPEED" });
    expect(result).toContain("2 file(s)");
    expect(result).toContain("2 replacement(s)");
    const playerContent = fs.readFileSync(path.join(TMP_DIR, "scripts", "player.gd"), "utf-8");
    expect(playerContent).toContain("MOVESPEED");
    expect(playerContent).not.toContain("= SPEED");
  });

  it("rejects missing params", () => {
    expect(() => batchEditScript({ project_path: "", search: "", replace: "" })).toThrow(/required/);
  });

  it("rejects non-existent project", () => {
    expect(() => batchEditScript({ project_path: "/nonexistent", search: "x", replace: "y" }))
      .toThrow(/not found/);
  });

  it("reports no matches gracefully", () => {
    createTestProject();
    const result = batchEditScript({ project_path: TMP_DIR, search: "NONEXISTENT_XYZ", replace: "foo" });
    expect(result).toContain("No matches found");
  });
});

// ── init_project ──
describe("initProject", () => {
  it("creates a complete project skeleton", () => {
    const result = initProject({ project_path: NEW_PROJECT, project_name: "TestGame" });
    expect(result).toContain("Created Godot project: TestGame");
    expect(fs.existsSync(path.join(NEW_PROJECT, "project.godot"))).toBe(true);
    expect(fs.existsSync(path.join(NEW_PROJECT, "scenes", "Main.tscn"))).toBe(true);
    expect(fs.existsSync(path.join(NEW_PROJECT, "scripts"))).toBe(true);
    expect(fs.existsSync(path.join(NEW_PROJECT, "assets", "textures"))).toBe(true);
    expect(fs.existsSync(path.join(NEW_PROJECT, "assets", "audio"))).toBe(true);
    expect(fs.existsSync(path.join(NEW_PROJECT, "assets", "fonts"))).toBe(true);
    expect(fs.existsSync(path.join(NEW_PROJECT, ".gitignore"))).toBe(true);
  });

  it("rejects empty path", () => {
    expect(() => initProject({ project_path: "" })).toThrow(/required/);
  });

  it("rejects existing directory", () => {
    fs.mkdirSync(NEW_PROJECT, { recursive: true });
    expect(() => initProject({ project_path: NEW_PROJECT })).toThrow(/already exists/);
  });
});
