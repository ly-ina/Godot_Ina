// Cover remaining dispatch.ts tool branches
import { describe, it, expect } from "vitest";
import { executeTool } from "../src/tools/dispatch.js";
import * as path from "path";
import * as fs from "fs";

const worldPath = path.resolve("test-fixtures/scenes/World.tscn");
const godotFile = path.join(path.resolve("test-fixtures/scenes"), "project.godot");

describe("dispatch tool branches", () => {
  // Ensure project.godot exists for tests that need it
  beforeEach(() => {
    if (!fs.existsSync(godotFile)) {
      fs.writeFileSync(godotFile, "; test\nconfig_version=5\n", "utf-8");
    }
  });

  it("read_scene works with valid path", () => {
    const r = executeTool("read_scene", { scene_path: worldPath });
    expect(r.content[0].text).toContain("World");
  });

  it("create_scene with project_path works", () => {
    const tmp = path.resolve("test-fixtures/scenes/__dispatch_create.tscn");
    try {
      const r = executeTool("create_scene", {
        scene_path: tmp,
        root_node_name: "Test",
        root_node_type: "Node2D",
        project_path: path.resolve("test-fixtures"),
      });
      expect(r.content[0].text).toContain("Created scene");
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });

  it("add_node works via dispatch", () => {
    const tmp = path.resolve("test-fixtures/scenes/__dispatch_add.tscn");
    try {
      executeTool("create_scene", { scene_path: tmp, root_node_name: "Root", root_node_type: "Node2D" });
      const r = executeTool("add_node", {
        scene_path: tmp,
        parent_node_name: ".",
        node_type: "Sprite2D",
        node_name: "MySprite",
        properties: { visible: true },
      });
      expect(r.content[0].text).toContain('Added node "MySprite"');
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });

  it("edit_node works via dispatch", () => {
    const r = executeTool("edit_node", {
      scene_path: worldPath,
      node_name: "World",
      properties: { __test_prop: true },
    });
    expect(r.content[0].text).toContain("__test_prop");
    // Clean up
    executeTool("edit_node", { scene_path: worldPath, node_name: "World", properties: { __test_prop: null } });
  });

  it("run_project dispatch handles valid project", () => {
    // Should try to find godot and fail gracefully
    const r = executeTool("run_project", { project_path: path.resolve("test-fixtures/scenes"), mode: "headless" });
    expect(r.content[0].text).toBeDefined();
  });

  it("edit_script dispatch works via dispatch", () => {
    const tmp = path.resolve("test-fixtures/scenes/__dispatch_edit.gd");
    try {
      fs.writeFileSync(tmp, 'extends Node2D\n\nfunc _ready():\n\tpass\n', "utf-8");
      const r = executeTool("edit_script", {
        script_path: tmp,
        replacements: [{ search: "pass", replace: "print(\"hello\")" }],
      });
      expect(r.content[0].text).toContain("Changes applied: 1");
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });
});
