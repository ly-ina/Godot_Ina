// Cover consolidated dispatch tool branches
import { describe, it, expect, beforeEach } from "vitest";
import { executeTool } from "../src/tools/dispatch.js";
import * as path from "path";
import * as fs from "fs";

const worldPath = path.resolve("test-fixtures/scenes/World.tscn");
const godotFile = path.join(path.resolve("test-fixtures/scenes"), "project.godot");

describe("dispatch tool branches", () => {
  beforeEach(() => {
    if (!fs.existsSync(godotFile)) {
      fs.writeFileSync(godotFile, "; test\nconfig_version=5\n", "utf-8");
    }
  });

  it("edit_scene read works with valid path", () => {
    const r = executeTool("edit_scene", { action: "read", scene_path: worldPath });
    expect(r.content[0].text).toContain("World");
  });

  it("edit_scene create works", () => {
    const tmp = path.resolve("test-fixtures/scenes/__dispatch_create.tscn");
    try {
      const r = executeTool("edit_scene", {
        action: "create",
        scene_path: tmp,
        scene_name: "Test",
        scene_type: "Node2D",
        project_path: path.resolve("test-fixtures"),
      });
      expect(r.content[0].text).toContain("Scene created");
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });

  it("edit_scene add_node works", () => {
    const tmp = path.resolve("test-fixtures/scenes/__dispatch_add.tscn");
    try {
      executeTool("edit_scene", { action: "create", scene_path: tmp, scene_name: "Root", scene_type: "Node2D" });
      const r = executeTool("edit_scene", {
        action: "add_node",
        scene_path: tmp,
        node_name: "MySprite",
        node_type: "Sprite2D",
        parent_path: ".",
      });
      expect(r.content[0].text).toContain("MySprite added");
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });

  it("edit_scene edit_node works", () => {
    const r = executeTool("edit_scene", {
      action: "edit_node",
      scene_path: worldPath,
      node_name: "World",
      properties: JSON.stringify({ __test_prop: true }),
    });
    expect(r.content[0].text).toContain("edited");
  });

  it("run_project handles valid project", () => {
    const r = executeTool("run_project", { project_path: path.resolve("test-fixtures/scenes"), mode: "headless" });
    expect(r.content[0].text).toBeDefined();
  });

  it("edit_script works via dispatch", () => {
    const tmp = path.resolve("test-fixtures/scenes/__dispatch_edit.gd");
    try {
      fs.writeFileSync(tmp, 'extends Node2D\n\nfunc _ready():\n\tpass\n', "utf-8");
      const r = executeTool("edit_script", {
        action: "edit",
        script_path: tmp,
        pattern: "pass",
        replacement: 'print("hello")',
      });
      expect(r.content[0].text).toContain("Modified script");
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });
});
