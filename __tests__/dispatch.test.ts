// Tests for the MCP dispatch layer (src/tools/dispatch.ts)
import { describe, it, expect } from "vitest";
import { getToolDefinitions, executeTool } from "../src/tools/dispatch.js";

describe("getToolDefinitions", () => {
  it("returns all 36 tool definitions", () => {
    const tools = getToolDefinitions();
    expect(tools.length).toBe(36);
  });

  it("each tool has name, description, inputSchema", () => {
    for (const tool of getToolDefinitions()) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeTruthy();
    }
  });

  it("tool names match expected set", () => {
    const names = getToolDefinitions().map(t => t.name);
    expect(names).toContain("ping");
    expect(names).toContain("list_scenes");
    expect(names).toContain("read_scene");
    expect(names).toContain("create_scene");
    expect(names).toContain("read_script");
    expect(names).toContain("add_node");
    expect(names).toContain("edit_node");
    expect(names).toContain("create_script");
    expect(names).toContain("run_project");
    expect(names).toContain("edit_script");
    expect(names).toContain("delete_node");
    expect(names).toContain("delete_file");
    expect(names).toContain("validate_scene");
    expect(names).toContain("validate_project");
    expect(names).toContain("execute_gdscript");
    expect(names).toContain("list_resources");
    expect(names).toContain("read_project_settings");
    expect(names).toContain("edit_project_settings");
    expect(names).toContain("search_nodes");
    expect(names).toContain("find_references");
    expect(names).toContain("import_resource");
    expect(names).toContain("delete_resource");
    expect(names).toContain("rename_node");
    expect(names).toContain("batch_edit_script");
    expect(names).toContain("init_project");
    expect(names).toContain("analyze_project");
    expect(names).toContain("generate_component");
    expect(names).toContain("generate_terrain");
    expect(names).toContain("generate_behavior_tree");
    expect(names).toContain("generate_equipment_system");
    expect(names).toContain("generate_scene_transition");
    expect(names).toContain("generate_slg_map");
    expect(names).toContain("generate_example_project");
    expect(names).toContain("translate_project");
    expect(names).toContain("generate_sprite");
    expect(names).toContain("generate_animation");
  });
});

describe("executeTool", () => {
  it("ping returns pong", () => {
    const result = executeTool("ping", {});
    expect(result.content[0].text).toBe("pong");
  });

  it("unknown tool throws error", () => {
    expect(() => executeTool("nonexistent_tool", {})).toThrow("Unknown tool");
  });

  it("missing required parameter throws error", () => {
    expect(() => executeTool("read_scene", {})).toThrow("Missing required parameter");
  });

  it("read_scene with non-existent file throws error", () => {
    expect(() => executeTool("read_scene", { scene_path: "/nonexistent.tscn" })).toThrow("not found");
  });

  it("create_scene with missing params throws error", () => {
    expect(() => executeTool("create_scene", {})).toThrow("Missing required");
  });

  it("create_scene with partial params throws error", () => {
    expect(() => executeTool("create_scene", { scene_path: "test.tscn" })).toThrow("Missing required");
  });

  it("run_project with missing path throws error", () => {
    expect(() => executeTool("run_project", {})).toThrow("project_path");
  });

  it("read_script with missing path throws error", () => {
    expect(() => executeTool("read_script", {})).toThrow("Missing required");
  });

  it("add_node with missing params throws error", () => {
    expect(() => executeTool("add_node", { scene_path: "test.tscn", parent_node_name: "." })).toThrow("Missing required");
  });

  it("edit_node with missing params throws error", () => {
    expect(() => executeTool("edit_node", { scene_path: "test.tscn" })).toThrow("Missing required");
  });

  it("create_script with missing content throws error", () => {
    expect(() => executeTool("create_script", { script_path: "test.gd" })).toThrow("Missing required");
  });

  it("edit_script with missing params throws error", () => {
    expect(() => executeTool("edit_script", {})).toThrow("Missing required");
  });

  it("delete_node with missing params throws error", () => {
    expect(() => executeTool("delete_node", {})).toThrow("Missing required");
  });

  it("delete_file with missing path throws error", () => {
    expect(() => executeTool("delete_file", {})).toThrow("Missing required");
  });

  it("validate_scene with missing path throws error", () => {
    expect(() => executeTool("validate_scene", {})).toThrow("Missing required");
  });

  it("validate_project with missing path throws error", () => {
    expect(() => executeTool("validate_project", {})).toThrow("Missing required");
  });

  it("execute_gdscript with missing params throws error", () => {
    expect(() => executeTool("execute_gdscript", {})).toThrow("Missing required");
  });

  it("list_resources with missing path throws error", () => {
    expect(() => executeTool("list_resources", {})).toThrow("Missing required");
  });

  it("read_project_settings with missing path throws error", () => {
    expect(() => executeTool("read_project_settings", {})).toThrow("Missing required");
  });

  it("edit_project_settings with missing params throws error", () => {
    expect(() => executeTool("edit_project_settings", {})).toThrow("Missing required");
  });

  it("search_nodes with missing path throws error", () => {
    expect(() => executeTool("search_nodes", {})).toThrow("Missing required");
  });

  it("find_references with missing params throws error", () => {
    expect(() => executeTool("find_references", {})).toThrow("Missing required");
  });

  it("import_resource with missing params throws error", () => {
    expect(() => executeTool("import_resource", {})).toThrow("Missing required");
  });

  it("delete_resource with missing params throws error", () => {
    expect(() => executeTool("delete_resource", {})).toThrow("Missing required");
  });

  it("rename_node with missing params throws error", () => {
    expect(() => executeTool("rename_node", {})).toThrow("Missing required");
  });

  it("batch_edit_script with missing params throws error", () => {
    expect(() => executeTool("batch_edit_script", {})).toThrow("Missing required");
  });

  it("init_project with missing path throws error", () => {
    expect(() => executeTool("init_project", {})).toThrow("Missing required");
  });

  it("analyze_project with missing path throws error", () => {
    expect(() => executeTool("analyze_project", {})).toThrow("Missing required");
  });

  it("generate_component with missing params throws error", () => {
    expect(() => executeTool("generate_component", {})).toThrow("Missing required");
  });

  it("generate_terrain with missing path throws error", () => {
    expect(() => executeTool("generate_terrain", {})).toThrow("Missing required");
  });

  it("generate_behavior_tree with missing path throws error", () => {
    expect(() => executeTool("generate_behavior_tree", {})).toThrow("Missing required");
  });

  it("generate_equipment_system with missing path throws error", () => {
    expect(() => executeTool("generate_equipment_system", {})).toThrow("Missing required");
  });

  it("generate_scene_transition with missing path throws error", () => {
    expect(() => executeTool("generate_scene_transition", {})).toThrow("Missing required");
  });

  it("generate_slg_map with missing path throws error", () => {
    expect(() => executeTool("generate_slg_map", {})).toThrow("Missing required");
  });

  it("generate_example_project with missing params throws error", () => {
    expect(() => executeTool("generate_example_project", {})).toThrow("Missing required");
  });

  it("translate_project with missing path throws error", () => {
    expect(() => executeTool("translate_project", {})).toThrow("Missing required");
  });

  it("generate_sprite with missing params throws error", () => {
    expect(() => executeTool("generate_sprite", {})).toThrow("Missing required");
  });

  it("generate_animation with missing path throws error", () => {
    expect(() => executeTool("generate_animation", {})).toThrow("Missing required");
  });
});
